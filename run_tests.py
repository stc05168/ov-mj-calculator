#!/usr/bin/env python3
"""Run the canonical Mahjong browser suite without requiring Node.js."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
RESULT_PATH = ROOT / "test-results" / "latest.json"
SCHEMA_VERSION = "mahjong-test-result/v1"
EXIT_TEST_FAILURE = 1
EXIT_BUILD_FAILURE = 2
EXIT_NO_BROWSER = 3
EXIT_TIMEOUT = 4
EXIT_INFRASTRUCTURE = 5
EXIT_SELF_TEST = 6

PROTECTED_PATHS = (
    ROOT / "mj.html",
    ROOT / "mj.css",
    ROOT / "mj.js",
    ROOT / "mjConst.js",
    ROOT / "checkHandType.js",
    ROOT / "test.html",
    ROOT / "build_test.py",
    ROOT / "run_tests.py",
    ROOT / ".github",
    ROOT / ".kiro",
    ROOT / "README.md",
    ROOT / "LICENSE",
    ROOT.parent / "台灣牌規則_OV_2.7.docx",
)
PRESERVATION_CASE_IDS = ("canonical-063", "canonical-076", "canonical-093")


class CompletionError(RuntimeError):
    """The browser did not return trustworthy completion evidence."""


class LoopbackServer:
    """Minimal loopback-only HTTP server for the generated test page."""

    def __init__(self, document: Path) -> None:
        self.document = document
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.socket.bind(("127.0.0.1", 0))
        self.socket.listen(8)
        self.socket.settimeout(0.25)
        self.port = int(self.socket.getsockname()[1])
        self.stopping = threading.Event()
        self.thread = threading.Thread(target=self._serve, daemon=True)

    def start(self) -> None:
        self.thread.start()

    def close(self) -> None:
        self.stopping.set()
        try:
            with socket.create_connection(("127.0.0.1", self.port), timeout=1):
                pass
        except OSError:
            pass
        self.thread.join(timeout=5)
        self.socket.close()

    def _serve(self) -> None:
        while not self.stopping.is_set():
            try:
                connection, _ = self.socket.accept()
            except socket.timeout:
                continue
            except OSError:
                break
            with connection:
                connection.settimeout(2)
                request = bytearray()
                try:
                    while b"\r\n\r\n" not in request and len(request) < 16384:
                        chunk = connection.recv(4096)
                        if not chunk:
                            break
                        request.extend(chunk)
                    first_line = bytes(request).split(b"\r\n", 1)[0]
                    requested_path = first_line.split(b" ", 2)[1].split(b"?", 1)[0] if b" " in first_line else b""
                    if requested_path == b"/test_standalone.html":
                        body = self.document.read_bytes()
                        header = (
                            b"HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\n"
                            + f"Content-Length: {len(body)}\r\nConnection: close\r\n\r\n".encode("ascii")
                        )
                        connection.sendall(header + body)
                    else:
                        body = b"Not Found"
                        connection.sendall(
                            b"HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\n"
                            + f"Content-Length: {len(body)}\r\nConnection: close\r\n\r\n".encode("ascii")
                            + body
                        )
                except (OSError, IndexError):
                    continue


class CompletionParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self.depth = 0
        self.current: list[str] | None = None
        self.payloads: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if tag.lower() == "script" and attributes.get("id") == "test-completion":
            self.depth += 1
            self.current = []

    def handle_data(self, data: str) -> None:
        if self.current is not None:
            self.current.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "script" and self.current is not None:
            self.payloads.append("".join(self.current))
            self.current = None


@dataclass(frozen=True)
class Browser:
    name: str
    path: Path
    source: str


@dataclass
class BrowserOutcome:
    browser: Browser
    kind: str
    message: str
    version: str | None = None
    payload: dict[str, Any] | None = None
    command: list[str] | None = None
    returncode: int | None = None
    stderr: str | None = None
    parity: dict[str, Any] | None = None


def normalized_hash(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def expected_source_hashes() -> dict[str, str]:
    return {name: normalized_hash(ROOT / name) for name in ("test.html", "mjConst.js", "checkHandType.js")}


def validate_completion(payload: Any, expected_hashes: dict[str, str]) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise CompletionError("Completion payload is not a JSON object")
    if payload.get("schemaVersion") != SCHEMA_VERSION:
        raise CompletionError(f"Unexpected completion schema: {payload.get('schemaVersion')!r}")
    if payload.get("status") not in {"success", "failure"}:
        raise CompletionError(f"Ambiguous completion status: {payload.get('status')!r}")
    build = payload.get("build")
    if not isinstance(build, dict) or build.get("schemaVersion") != SCHEMA_VERSION:
        raise CompletionError("Missing or incompatible generated build metadata")
    if build.get("sourceHashes") != expected_hashes:
        raise CompletionError("Stale completion payload: source hashes do not match current canonical inputs")
    counts = payload.get("counts")
    required_counts = ("discovered", "executed", "passed", "failed", "errors")
    if not isinstance(counts, dict) or any(not isinstance(counts.get(key), int) for key in required_counts):
        raise CompletionError("Completion counts are missing or malformed")
    if counts["discovered"] != counts["executed"]:
        raise CompletionError("Incomplete execution: discovered count differs from executed count")
    if counts["executed"] != counts["passed"] + counts["failed"] + counts["errors"]:
        raise CompletionError("Inconsistent completion counts")
    if payload.get("invariant") is not True:
        raise CompletionError("Browser completion invariant is false")
    probes = payload.get("oracleProbes")
    if not isinstance(probes, dict) or probes.get("failed") != 0:
        raise CompletionError("Strict assertion oracle probes did not pass")
    inventory = payload.get("inventory")
    if not isinstance(inventory, dict) or inventory.get("passed") is not True:
        raise CompletionError("Pre-fix canonical test-ID inventory is incomplete or duplicated")
    preservation = payload.get("preservation")
    if not isinstance(preservation, dict):
        raise CompletionError("Preservation baseline summary is missing")
    if preservation.get("total") != len(PRESERVATION_CASE_IDS):
        raise CompletionError("Unexpected preservation baseline case count")
    if preservation.get("failed") != 0 or preservation.get("errors") != 0:
        raise CompletionError("Preservation baseline has a differential or error")
    if tuple(preservation.get("ids", ())) != PRESERVATION_CASE_IDS:
        raise CompletionError("Preservation baseline IDs do not match the frozen snapshot")
    if payload.get("executionMode") not in {"auto", "manual"}:
        raise CompletionError("Completion execution mode is missing or ambiguous")
    expected_status = "success" if counts["failed"] == counts["errors"] == 0 else "failure"
    if payload["status"] != expected_status:
        raise CompletionError("Completion status conflicts with failure/error counts")
    return payload


def parse_completion(dom: str, expected_hashes: dict[str, str]) -> dict[str, Any]:
    parser = CompletionParser()
    parser.feed(dom)
    if len(parser.payloads) != 1:
        raise CompletionError(f"Expected exactly one completion payload; found {len(parser.payloads)}")
    raw = parser.payloads[0].strip()
    if not raw:
        raise CompletionError("Completion payload is empty")
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise CompletionError(f"Malformed completion JSON: {exc}") from exc
    return validate_completion(payload, expected_hashes)


def classify_browser(path: Path) -> str:
    name = path.name.lower()
    return "edge" if "edge" in name else "chrome" if "chrome" in name else "configured"


def standard_browser_paths() -> list[tuple[str, Path]]:
    env = os.environ
    roots = [env.get("PROGRAMFILES"), env.get("PROGRAMFILES(X86)"), env.get("LOCALAPPDATA")]
    candidates: list[tuple[str, Path]] = []
    for root in filter(None, roots):
        base = Path(root)
        candidates.extend(
            [
                ("chrome", base / "Google" / "Chrome" / "Application" / "chrome.exe"),
                ("edge", base / "Microsoft" / "Edge" / "Application" / "msedge.exe"),
            ]
        )
    return candidates


def discover_browsers(selector: str) -> tuple[list[Browser], dict[str, Any]]:
    attempted: list[dict[str, str]] = []
    candidates: list[Browser] = []

    def consider(path_value: str | Path | None, source: str, forced_name: str | None = None) -> None:
        if not path_value:
            return
        path = Path(path_value).expanduser()
        attempted.append({"path": str(path), "source": source})
        if path.is_file():
            candidates.append(Browser(forced_name or classify_browser(path), path.resolve(), source))

    configured = os.environ.get("MJ_TEST_BROWSER")
    consider(configured, "MJ_TEST_BROWSER")
    if selector not in {"auto", "all", "chrome", "edge"}:
        consider(selector, "--browser")
    for executable, name in (("chrome", "chrome"), ("chrome.exe", "chrome"), ("msedge", "edge"), ("msedge.exe", "edge")):
        found = shutil.which(executable)
        attempted.append({"path": executable, "source": "PATH"})
        if found:
            candidates.append(Browser(name, Path(found).resolve(), "PATH"))
    for name, path in standard_browser_paths():
        consider(path, "standard-location", name)

    unique: list[Browser] = []
    seen: set[str] = set()
    for browser in candidates:
        key = os.path.normcase(str(browser.path))
        if key not in seen:
            seen.add(key)
            unique.append(browser)
    if selector in {"chrome", "edge"}:
        unique = [browser for browser in unique if browser.name == selector]
    elif selector not in {"auto", "all"}:
        requested = os.path.normcase(str(Path(selector).expanduser().resolve()))
        unique = [browser for browser in unique if os.path.normcase(str(browser.path)) == requested]

    availability = {
        "chrome": [str(browser.path) for browser in unique if browser.name == "chrome"],
        "edge": [str(browser.path) for browser in unique if browser.name == "edge"],
        "attempted": attempted,
    }
    return unique, availability


def browser_version(browser: Browser) -> str | None:
    try:
        version_directories = [
            child.name
            for child in browser.path.parent.iterdir()
            if child.is_dir() and len(child.name.split(".")) >= 3 and all(part.isdigit() for part in child.name.split("."))
        ]
    except OSError:
        version_directories = []
    if version_directories:
        version = max(version_directories, key=lambda value: tuple(int(part) for part in value.split(".")))
        return f"{browser.name} {version}"
    try:
        completed = subprocess.run(
            [str(browser.path), "--version"], capture_output=True, text=True, timeout=10, check=False
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    value = (completed.stdout or completed.stderr).strip()
    return value or None


def terminate_process_tree(process: subprocess.Popen[str]) -> None:
    if process.poll() is not None:
        return
    if os.name == "nt":
        try:
            subprocess.run(
                ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                capture_output=True,
                text=True,
                timeout=5,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired):
            process.kill()
    else:
        process.kill()
    try:
        process.wait(timeout=3)
    except subprocess.TimeoutExpired:
        process.kill()


def run_browser_once(browser: Browser, url: str, timeout: float, hashes: dict[str, str]) -> BrowserOutcome:
    profile = tempfile.mkdtemp(prefix="mj-browser-profile-")
    command = [
        str(browser.path),
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-component-update",
        "--disable-default-apps",
        "--disable-sync",
        "--metrics-recording-only",
        "--no-first-run",
        "--no-default-browser-check",
        f"--user-data-dir={profile}",
        "--dump-dom",
        url,
    ]
    process: subprocess.Popen[str] | None = None
    stdout = ""
    stderr = ""
    returncode: int | None = None
    try:
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        try:
            stdout, stderr = process.communicate(timeout=timeout)
            returncode = process.returncode
        except subprocess.TimeoutExpired:
            terminate_process_tree(process)
            return BrowserOutcome(browser, "timeout", f"Browser timed out after {timeout:g}s", command=command)
    except OSError as exc:
        return BrowserOutcome(browser, "startup-error", f"Browser could not start: {exc}", command=command)
    finally:
        if process is not None and process.poll() is None:
            terminate_process_tree(process)
        shutil.rmtree(profile, ignore_errors=True)
    try:
        payload = parse_completion(stdout, hashes)
    except CompletionError as exc:
        return BrowserOutcome(
            browser,
            "completion-error",
            str(exc),
            version=browser_version(browser),
            command=command,
            returncode=returncode,
            stderr=stderr[-4000:] if stderr else None,
        )
    counts = payload["counts"]
    kind = "success" if payload["status"] == "success" else "test-failure"
    message = (
        f"{counts['passed']} passed, {counts['failed']} failed, "
        f"{counts['errors']} errors, {counts['discovered']} discovered"
    )
    return BrowserOutcome(
        browser,
        kind,
        message,
        version=browser_version(browser),
        payload=payload,
        command=command,
        returncode=returncode,
        stderr=stderr[-4000:] if stderr else None,
    )


def parity_projection(payload: dict[str, Any]) -> dict[str, Any]:
    """Select deterministic verdict data shared by button-driven and auto execution."""
    return {
        "status": payload.get("status"),
        "counts": payload.get("counts"),
        "invariant": payload.get("invariant"),
        "testIds": payload.get("testIds"),
        "inventory": payload.get("inventory"),
        "preservation": payload.get("preservation"),
        "cases": [
            {
                "id": case.get("id"),
                "status": case.get("status"),
                "actual": case.get("actual"),
                "violations": case.get("violations"),
                "error": case.get("error"),
            }
            for case in payload.get("cases", [])
        ],
    }


def run_browser(browser: Browser, base_url: str, timeout: float, hashes: dict[str, str]) -> BrowserOutcome:
    auto = run_browser_once(browser, f"{base_url}?run=auto", timeout, hashes)
    if auto.kind not in {"success", "test-failure"}:
        return auto
    manual = run_browser_once(browser, f"{base_url}?run=manual-probe", timeout, hashes)
    if manual.kind not in {"success", "test-failure"}:
        auto.kind = manual.kind
        auto.message = f"Manual execution parity probe failed: {manual.message}"
        auto.parity = {"passed": False, "manualKind": manual.kind}
        return auto
    auto_projection = parity_projection(auto.payload or {})
    manual_projection = parity_projection(manual.payload or {})
    passed = auto_projection == manual_projection
    auto.parity = {
        "passed": passed,
        "autoMode": (auto.payload or {}).get("executionMode"),
        "manualMode": (manual.payload or {}).get("executionMode"),
        "autoCounts": (auto.payload or {}).get("counts"),
        "manualCounts": (manual.payload or {}).get("counts"),
    }
    if not passed:
        auto.kind = "completion-error"
        auto.message = "Manual and strict auto-run verdicts differ"
    return auto


def run_build() -> tuple[bool, str]:
    try:
        root_string = str(ROOT)
        if root_string not in sys.path:
            sys.path.insert(0, root_string)
        import build_test

        result = build_test.build()
    except Exception as exc:
        return False, f"{type(exc).__name__}: {exc}"
    return True, json.dumps(result, ensure_ascii=False, sort_keys=True)


def revision() -> str | None:
    try:
        completed = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True, timeout=10, check=False
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    return completed.stdout.strip() or None


def protected_material_record() -> dict[str, Any]:
    records = [
        {
            "path": str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path),
            "exists": path.exists(),
            "kind": "directory" if path.is_dir() else "file",
        }
        for path in PROTECTED_PATHS
    ]
    return {"passed": all(record["exists"] for record in records), "paths": records}


def outcome_record(outcome: BrowserOutcome) -> dict[str, Any]:
    return {
        "browser": {"name": outcome.browser.name, "path": str(outcome.browser.path), "source": outcome.browser.source},
        "version": outcome.version,
        "kind": outcome.kind,
        "message": outcome.message,
        "returncode": outcome.returncode,
        "command": outcome.command,
        "stderr": outcome.stderr,
        "parity": outcome.parity,
        "payload": outcome.payload,
    }


def write_evidence(status: str, selector: str, availability: dict[str, Any], hashes: dict[str, str], outcomes: list[BrowserOutcome], build_output: str) -> None:
    evidence = {
        "schemaVersion": "mahjong-runner-evidence/v1",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "executionPath": "Python build_test.py -> loopback HTTP -> isolated headless Chrome/Edge --dump-dom",
        "globalNodeRequired": False,
        "invocation": [sys.executable, str(Path(__file__).name), *sys.argv[1:]],
        "browserSelector": selector,
        "browserAvailability": availability,
        "protectedMaterial": protected_material_record(),
        "sourceRevision": revision(),
        "sourceHashes": hashes,
        "buildOutput": build_output,
        "runs": [outcome_record(outcome) for outcome in outcomes],
    }
    RESULT_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = RESULT_PATH.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    temporary.replace(RESULT_PATH)


def run_self_test() -> int:
    hashes = {"test.html": "a", "mjConst.js": "b", "checkHandType.js": "c"}
    valid = {
        "schemaVersion": SCHEMA_VERSION,
        "status": "success",
        "executionMode": "auto",
        "counts": {"discovered": 1, "executed": 1, "passed": 1, "failed": 0, "errors": 0},
        "invariant": True,
        "build": {"schemaVersion": SCHEMA_VERSION, "sourceHashes": hashes},
        "oracleProbes": {"failed": 0},
        "inventory": {"passed": True},
        "preservation": {
            "total": len(PRESERVATION_CASE_IDS),
            "passed": len(PRESERVATION_CASE_IDS),
            "failed": 0,
            "errors": 0,
            "ids": list(PRESERVATION_CASE_IDS),
        },
    }

    def dom(payload: Any) -> str:
        return f'<script id="test-completion" type="application/json">{json.dumps(payload)}</script>'

    checks: list[tuple[str, bool]] = []
    checks.append(("valid", parse_completion(dom(valid), hashes)["status"] == "success"))
    assertion_failure = {
        **valid,
        "status": "failure",
        "counts": {"discovered": 1, "executed": 1, "passed": 0, "failed": 1, "errors": 0},
    }
    thrown_error = {
        **valid,
        "status": "failure",
        "counts": {"discovered": 1, "executed": 1, "passed": 0, "failed": 0, "errors": 1},
    }
    checks.append(("assertion-failure-distinct", parse_completion(dom(assertion_failure), hashes)["counts"]["failed"] == 1))
    checks.append(("thrown-error-distinct", parse_completion(dom(thrown_error), hashes)["counts"]["errors"] == 1))
    missing_browser = Browser("probe", ROOT / "definitely-missing-browser.exe", "self-test")
    startup_outcome = run_browser(missing_browser, "http://127.0.0.1:1/", 0.1, hashes)
    checks.append(("browser-startup-failure", startup_outcome.kind == "startup-error"))
    sleeper = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(5)"])
    try:
        sleeper.wait(timeout=0.05)
    except subprocess.TimeoutExpired:
        terminate_process_tree(sleeper)
        checks.append(("hard-timeout-termination", sleeper.poll() is not None))
    else:
        checks.append(("hard-timeout-termination", False))
    invalid_documents = {
        "missing": "<html></html>",
        "duplicate": dom(valid) + dom(valid),
        "malformed": '<script id="test-completion">{</script>',
        "stale": dom({**valid, "build": {"schemaVersion": SCHEMA_VERSION, "sourceHashes": {}}}),
        "incomplete": dom({**valid, "counts": {**valid["counts"], "executed": 0}}),
        "inconsistent": dom({**valid, "counts": {**valid["counts"], "passed": 0}}),
    }
    for name, document in invalid_documents.items():
        try:
            parse_completion(document, hashes)
        except CompletionError:
            checks.append((name, True))
        else:
            checks.append((name, False))
    failed = [name for name, passed in checks if not passed]
    print(json.dumps({"selfTest": "passed" if not failed else "failed", "checks": checks}, indent=2))
    return 0 if not failed else EXIT_SELF_TEST


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--browser", default="auto", help="auto, all, chrome, edge, or an explicit executable path")
    parser.add_argument("--timeout", type=float, default=90.0, help="hard timeout per browser in seconds")
    parser.add_argument("--self-test", action="store_true", help="validate completion parser rejection probes")
    args = parser.parse_args()
    if args.self_test:
        return run_self_test()
    if args.timeout <= 0:
        parser.error("--timeout must be positive")

    print("Building canonical standalone suite with Python...", flush=True)
    built, build_output = run_build()
    hashes = expected_source_hashes()
    if not built:
        write_evidence("build-failure", args.browser, {"attempted": []}, hashes, [], build_output)
        print(build_output, file=sys.stderr)
        return EXIT_BUILD_FAILURE
    print("Build complete; discovering browsers...", flush=True)

    browsers, availability = discover_browsers(args.browser)
    if not browsers:
        write_evidence("no-browser", args.browser, availability, hashes, [], build_output)
        print(json.dumps({"status": "no-browser", "availability": availability}, indent=2), file=sys.stderr)
        return EXIT_NO_BROWSER

    print(f"Discovered {len(browsers)} requested browser(s); starting loopback server...", flush=True)
    server = LoopbackServer(ROOT / "test_standalone.html")
    server.start()
    url = f"http://127.0.0.1:{server.port}/test_standalone.html"
    outcomes: list[BrowserOutcome] = []
    try:
        for browser in browsers:
            print(f"Launching {browser.name}: {browser.path}", flush=True)
            outcome = run_browser(browser, url, args.timeout, hashes)
            outcomes.append(outcome)
            print(f"[{browser.name}] {outcome.kind}: {outcome.message}")
            if args.browser == "auto" and outcome.kind in {"success", "test-failure"}:
                break
    finally:
        server.close()

    valid_outcomes = [outcome for outcome in outcomes if outcome.kind in {"success", "test-failure"}]
    protected = protected_material_record()
    if not protected["passed"]:
        status, exit_code = "protected-material-missing", EXIT_INFRASTRUCTURE
    elif any(outcome.kind == "test-failure" for outcome in valid_outcomes):
        status, exit_code = "test-failure", EXIT_TEST_FAILURE
    elif valid_outcomes and all(outcome.kind == "success" for outcome in valid_outcomes):
        status, exit_code = "success", 0
    elif any(outcome.kind == "timeout" for outcome in outcomes):
        status, exit_code = "timeout", EXIT_TIMEOUT
    else:
        status, exit_code = "infrastructure-failure", EXIT_INFRASTRUCTURE
    write_evidence(status, args.browser, availability, hashes, outcomes, build_output)
    print(f"Evidence: {RESULT_PATH}")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
