"""Run the Taiwan Mahjong session scorekeeper scenarios in Chrome and Edge without Node.js."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import tempfile
import threading
import time
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
TEST_PAGE = "scorekeeper-tests.html"
EVIDENCE_PATH = ROOT / "test-results" / "scorekeeper-latest.json"
CALLBACK_PATH = "/__scorekeeper_completion"
MAX_COMPLETION_BYTES = 5 * 1024 * 1024

STANDARD_BROWSERS = {
    "chrome": [
        Path(os.environ.get("PROGRAMFILES", r"C:\Program Files")) / "Google/Chrome/Application/chrome.exe",
        Path(os.environ.get("PROGRAMFILES(X86)", r"C:\Program Files (x86)")) / "Google/Chrome/Application/chrome.exe",
        Path(os.environ.get("LOCALAPPDATA", "")) / "Google/Chrome/Application/chrome.exe",
    ],
    "edge": [
        Path(os.environ.get("PROGRAMFILES(X86)", r"C:\Program Files (x86)")) / "Microsoft/Edge/Application/msedge.exe",
        Path(os.environ.get("PROGRAMFILES", r"C:\Program Files")) / "Microsoft/Edge/Application/msedge.exe",
        Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft/Edge/Application/msedge.exe",
    ],
}


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args: object) -> None:
        return

    def handle_one_request(self) -> None:
        try:
            super().handle_one_request()
        except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
            return


class LoopbackServer:
    def __init__(self) -> None:
        self._completion: str | None = None
        self._completion_lock = threading.Lock()
        self._completion_event = threading.Event()
        owner = self

        class CallbackHandler(QuietHandler):
            def do_POST(self) -> None:  # noqa: N802 - inherited HTTP handler name
                if urlsplit(self.path).path != CALLBACK_PATH:
                    self.send_error(404)
                    return
                try:
                    length = int(self.headers.get("Content-Length", "0"))
                except ValueError:
                    self.send_error(400)
                    return
                if length < 1 or length > MAX_COMPLETION_BYTES:
                    self.send_error(413)
                    return
                try:
                    body = self.rfile.read(length).decode("utf-8")
                except UnicodeDecodeError:
                    self.send_error(400)
                    return
                owner.record_completion(body)
                self.send_response(204)
                self.send_header("Cache-Control", "no-store")
                self.send_header("Content-Length", "0")
                self.end_headers()

        handler = lambda *args, **kwargs: CallbackHandler(*args, directory=str(ROOT), **kwargs)
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)

    @property
    def url(self) -> str:
        host, port = self.server.server_address
        return f"http://{host}:{port}/{TEST_PAGE}?run=auto"

    def prepare_run(self) -> None:
        with self._completion_lock:
            self._completion = None
        self._completion_event.clear()

    def record_completion(self, value: str) -> None:
        with self._completion_lock:
            if self._completion is None:
                self._completion = value
                self._completion_event.set()

    def wait_for_completion(self, timeout: float) -> str | None:
        if not self._completion_event.wait(timeout):
            return None
        with self._completion_lock:
            return self._completion

    def __enter__(self) -> "LoopbackServer":
        self.thread.start()
        return self

    def __exit__(self, *_args: object) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=5)


def discover(name: str) -> list[tuple[str, Path]]:
    requested = ["chrome", "edge"] if name == "all" else [name]
    found: list[tuple[str, Path]] = []
    for browser_name in requested:
        path_from_env = shutil.which(browser_name) or shutil.which(f"{browser_name}.exe")
        candidates = ([Path(path_from_env)] if path_from_env else []) + STANDARD_BROWSERS[browser_name]
        seen: set[str] = set()
        for candidate in candidates:
            key = str(candidate).lower()
            if key in seen:
                continue
            seen.add(key)
            if candidate.is_file():
                found.append((browser_name, candidate))
                break
    return found


def browser_version(path: Path) -> str:
    try:
        result = subprocess.run([str(path), "--version"], capture_output=True, text=True, timeout=10)
        return (result.stdout or result.stderr).strip() or "unknown"
    except Exception:
        return "unknown"


def validate_completion(payload: object) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("completion payload must be an object")
    if payload.get("schemaVersion") != "ov-mj-scorekeeper-tests/v1":
        raise ValueError("unexpected completion schema")
    counts = payload.get("counts", {})
    required = {"discovered", "executed", "passed", "failed", "errors"}
    if not isinstance(counts, dict) or set(counts) != required:
        raise ValueError("completion counts are incomplete")
    if counts["discovered"] != counts["executed"]:
        raise ValueError("discovered/executed mismatch")
    if counts["passed"] + counts["failed"] + counts["errors"] != counts["executed"]:
        raise ValueError("completion counts are inconsistent")
    if not payload.get("invariant"):
        raise ValueError("test invariant is false")
    return payload


def terminate_process_tree(process: subprocess.Popen) -> None:
    if process.poll() is not None:
        return
    if os.name == "nt":
        try:
            subprocess.run(
                ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired):
            process.kill()
    else:
        process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()


def run_browser(name: str, path: Path, server: LoopbackServer, timeout: float) -> dict:
    with tempfile.TemporaryDirectory(prefix=f"scorekeeper-{name}-") as profile:
        command = [
            str(path),
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
            "--remote-debugging-port=0",
            server.url,
        ]
        server.prepare_run()
        started = time.monotonic()
        process: subprocess.Popen | None = None
        stderr = ""
        returncode: int | None = None
        callback: str | None = None

        with tempfile.TemporaryFile(mode="w+", encoding="utf-8") as error_output:
            try:
                process = subprocess.Popen(command, stdout=subprocess.DEVNULL, stderr=error_output)
                callback = server.wait_for_completion(timeout)
            except OSError as error:
                return {
                    "browser": name,
                    "path": str(path),
                    "version": browser_version(path),
                    "status": "startup-error",
                    "durationSeconds": round(time.monotonic() - started, 3),
                    "message": str(error),
                }
            finally:
                if process is not None:
                    terminate_process_tree(process)
                    returncode = process.poll()
                error_output.seek(0)
                stderr = error_output.read()[-4000:]

        duration = round(time.monotonic() - started, 3)
        if callback is None:
            return {
                "browser": name,
                "path": str(path),
                "version": browser_version(path),
                "status": "timeout",
                "durationSeconds": duration,
                "returncode": returncode,
                "message": f"completion callback timed out after {timeout:g}s",
                "stderr": stderr,
            }

        try:
            payload = validate_completion(json.loads(callback))
            status = "success" if payload["status"] == "success" and payload["counts"]["failed"] == 0 and payload["counts"]["errors"] == 0 else "failure"
            message = (
                f'{payload["counts"]["passed"]} passed, '
                f'{payload["counts"]["failed"]} failed, '
                f'{payload["counts"]["errors"]} errors, '
                f'{payload["counts"]["discovered"]} discovered'
            )
            return {
                "browser": name,
                "path": str(path),
                "version": browser_version(path),
                "status": status,
                "durationSeconds": duration,
                "returncode": returncode,
                "message": message,
                "payload": payload,
                "stderr": stderr,
            }
        except Exception as error:
            return {
                "browser": name,
                "path": str(path),
                "version": browser_version(path),
                "status": "infrastructure-error",
                "durationSeconds": duration,
                "returncode": returncode,
                "message": str(error),
                "callbackTail": callback[-4000:],
                "stderr": stderr,
            }


def write_evidence(selector: str, runs: list[dict]) -> None:
    evidence = {
        "schemaVersion": "ov-mj-scorekeeper-runner/v1",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "success" if runs and all(run["status"] == "success" for run in runs) else "failure",
        "invocation": {"browser": selector, "nodeRequired": False, "completionTransport": "same-origin-callback"},
        "runs": runs,
    }
    EVIDENCE_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = EVIDENCE_PATH.with_suffix(".tmp")
    temporary.write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(EVIDENCE_PATH)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--browser", choices=["all", "chrome", "edge"], default="all")
    parser.add_argument("--timeout", type=float, default=120.0)
    args = parser.parse_args()
    if args.timeout <= 0:
        parser.error("--timeout must be positive")
    if not (ROOT / TEST_PAGE).is_file():
        print(f"Missing canonical test page: {TEST_PAGE}")
        return 2

    browsers = discover(args.browser)
    expected_count = 2 if args.browser == "all" else 1
    if len(browsers) != expected_count:
        missing = expected_count - len(browsers)
        print(f"Unable to find {missing} requested browser(s).")
        return 3

    runs: list[dict] = []
    with LoopbackServer() as server:
        for name, path in browsers:
            print(f"Launching {name}: {path}", flush=True)
            run = run_browser(name, path, server, args.timeout)
            runs.append(run)
            print(f'[{name}] {run["status"]}: {run["message"]}', flush=True)

    write_evidence(args.browser, runs)
    print(f"Evidence: {EVIDENCE_PATH}")
    return 0 if all(run["status"] == "success" for run in runs) else 1


if __name__ == "__main__":
    raise SystemExit(main())
