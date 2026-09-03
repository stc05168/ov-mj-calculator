#!/usr/bin/env python3
"""Build the canonical browser suite as deterministic self-contained HTML."""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "test_standalone.html"
SCHEMA_VERSION = "mahjong-test-result/v1"
MARKERS = (
    "// TEST-DEFINITIONS-BEGIN",
    "// TEST-DEFINITIONS-END",
    "// TEST-HARNESS-BEGIN",
    "// TEST-HARNESS-END",
)


class BuildError(RuntimeError):
    """Raised when canonical extraction or generation is ambiguous."""


def read_utf8(name: str) -> str:
    path = ROOT / name
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        raise BuildError(f"Cannot read {name}: {exc}") from exc


def source_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def require_unique(text: str, token: str, source_name: str) -> None:
    count = text.count(token)
    if count != 1:
        raise BuildError(f"Expected exactly one {token!r} in {source_name}; found {count}")


def inline_script(html: str, src: str, javascript: str, prefix: str = "") -> str:
    pattern = re.compile(rf'<script\s+src=["\']{re.escape(src)}["\']\s*>\s*</script>', re.IGNORECASE)
    matches = pattern.findall(html)
    if len(matches) != 1:
        raise BuildError(f"Expected exactly one external script tag for {src}; found {len(matches)}")
    safe_javascript = javascript.replace("</script", "<\\/script")
    replacement = f"<script>\n{prefix}{safe_javascript}\n</script>"
    return pattern.sub(lambda _: replacement, html, count=1)


def build() -> dict[str, object]:
    test_html = read_utf8("test.html")
    mjconst = read_utf8("mjConst.js")
    checkhandtype = read_utf8("checkHandType.js")

    for marker in MARKERS:
        require_unique(test_html, marker, "test.html")
    positions = [test_html.index(marker) for marker in MARKERS]
    if positions != sorted(positions):
        raise BuildError("Canonical test markers are out of order")

    definitions = test_html[positions[0] : positions[1]]
    harness = test_html[positions[2] : positions[3]]
    if definitions.count("add(") < 1 or "function add(" not in definitions:
        raise BuildError("Canonical test definition section is empty or malformed")
    for required in ("function evaluateAssertions(", "function runAllTests(", "writeCompletion(payload)"):
        if required not in harness:
            raise BuildError(f"Canonical harness is missing {required}")

    completion_pattern = re.compile(
        r'<script\s+id=["\']test-completion["\']\s+type=["\']application/json["\']\s*>\s*</script>',
        re.IGNORECASE,
    )
    if len(completion_pattern.findall(test_html)) != 1:
        raise BuildError("Canonical completion element must exist exactly once and be empty")
    if re.search(r"window\.__TEST_BUILD_META__\s*=", test_html):
        raise BuildError("Canonical test.html must not contain generated build metadata assignment")

    hashes = {
        "test.html": source_hash(test_html),
        "mjConst.js": source_hash(mjconst),
        "checkHandType.js": source_hash(checkhandtype),
    }
    build_meta = {"schemaVersion": SCHEMA_VERSION, "sourceHashes": hashes}
    prefix = f"window.__TEST_BUILD_META__={json.dumps(build_meta, ensure_ascii=False, separators=(',', ':'))};\n"

    output = inline_script(test_html, "mjConst.js", mjconst, prefix=prefix)
    output = inline_script(output, "checkHandType.js", checkhandtype)
    output = output.replace("\r\n", "\n").replace("\r", "\n")
    if not output.endswith("\n"):
        output += "\n"

    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", newline="\n", dir=ROOT, prefix="test_standalone-", suffix=".tmp", delete=False
    ) as handle:
        handle.write(output)
        temporary = Path(handle.name)
    try:
        for attempt in range(10):
            try:
                os.replace(temporary, OUTPUT)
                break
            except PermissionError:
                if attempt == 9:
                    raise
                time.sleep(0.1 * (attempt + 1))
    finally:
        temporary.unlink(missing_ok=True)
    return {
        "output": OUTPUT.name,
        "bytes": len(output.encode("utf-8")),
        "sourceHashes": hashes,
    }


def main() -> int:
    try:
        result = build()
    except BuildError as exc:
        print(f"build_test.py: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
