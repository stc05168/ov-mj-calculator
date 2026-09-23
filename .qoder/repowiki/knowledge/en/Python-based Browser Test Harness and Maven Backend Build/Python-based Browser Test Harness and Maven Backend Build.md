---
kind: build_system
name: Python-based Browser Test Harness and Maven Backend Build
category: build_system
scope:
    - '**'
source_files:
    - ov-mj-calculator/build_test.py
    - ov-mj-calculator/run_tests.py
    - ov-mj-calculator/run_scorekeeper_tests.py
    - ov-mj-calculator/check_tests.py
    - ov-mj-calculator/test.html
    - ov-mj-calculator/mjConst.js
    - ov-mj-calculator/checkHandType.js
    - ov-mj-calculator/test-results/latest.json
    - ov-mj-calculator/test-results/scorekeeper-latest.json
    - backend/pom.xml
---

## What system/approach is used

The repository uses a **pure-Python, no-Node.js build-and-test pipeline** for the browser suite plus a standard **Maven/Spring Boot** build for the Java backend. There are no Makefiles, Dockerfiles, or npm scripts; everything is driven by Python entry points that invoke headless Chrome/Edge via subprocess.

### Browser test harness (`ov-mj-calculator/`)

- `build_test.py` is the deterministic builder: it reads `test.html`, `mjConst.js`, and `checkHandType.js`, validates canonical markers, inlines the two JS sources into a single `test_standalone.html`, injects a `window.__TEST_BUILD_META__` object containing source SHA-256 hashes and a schema version (`mahjong-test-result/v1`), normalizes line endings to LF, and writes the output atomically via a temp file + rename.
- `run_tests.py` is the orchestrator: it calls `build_test.build()`, starts an in-process loopback HTTP server (only serving `/test_standalone.html` on `127.0.0.1`), discovers installed Chrome/Edge executables (via `PATH`, `PROGRAMFILES`, `LOCALAPPDATA`, or `MJ_TEST_BROWSER`), launches each in headless mode with `--dump-dom`, parses the DOM for a `<script id="test-completion" type="application/json">` payload, validates it against a strict schema (counts consistency, preservation baselines, oracle probes, inventory), runs both `?run=auto` and `?run=manual-probe` modes and asserts parity, and writes a JSON evidence artifact to `test-results/latest.json`.
- `run_scorekeeper_tests.py` follows the same pattern for the session scorekeeper page (`scorekeeper-tests.html`): serves the page from a local `ThreadingHTTPServer`, waits for a POST callback at `/__scorekeeper_completion`, validates the `ov-mj-scorekeeper-tests/v1` schema, and writes `test-results/scorekeeper-latest.json`.
- `check_tests.py` is a lightweight static analyzer that scans `test.html` for `add(...)` blocks and reports tile-count violations (>4 of any tile) or wrong hand sizes (≠17).

### Java backend build (`backend/`)

- `backend/pom.xml` declares a Spring Boot 3.5.7 parent, Java 17, and dependencies for `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-validation`, `spring-security-crypto`, H2 (runtime), PostgreSQL (runtime), and `spring-boot-starter-test`. The `spring-boot-maven-plugin` is configured as the only plugin, producing a runnable JAR via `mvn package`.

### CI / GitHub Actions

- `.github/workflows/` contains a set of numbered starter workflows (`0-welcome.yml` through `5-merge-your-pull-request.yml`) under the `ov-mj-calculator` subdirectory — these are GitHub Pages course templates and are not part of this project's own CI. No workflow was found that invokes `run_tests.py` or `mvn` for this repo.

## Key files and packages

- `ov-mj-calculator/build_test.py` — deterministic HTML bundler with marker validation and source hashing
- `ov-mj-calculator/run_tests.py` — headless browser runner, completion validator, evidence writer
- `ov-mj-calculator/run_scorekeeper_tests.py` — session scorekeeper test runner with POST callback transport
- `ov-mj-calculator/check_tests.py` — static tile-count sanity checker
- `ov-mj-calculator/test.html` — canonical test definitions bounded by `// TEST-DEFINITIONS-BEGIN/END` and `// TEST-HARNESS-BEGIN/END` markers
- `ov-mj-calculator/mjConst.js`, `ov-mj-calculator/checkHandType.js` — inlined dependencies
- `ov-mj-calculator/test-results/latest.json`, `ov-mj-calculator/test-results/scorekeeper-latest.json` — generated evidence artifacts
- `backend/pom.xml` — Maven build descriptor for the Spring Boot REST API

## Architecture and conventions

1. **Single-file, no-toolchain builds.** The entire browser test pipeline requires only Python 3 and a Chromium-based browser binary — no Node.js, no npm, no bundler. The builder script performs string-level templating rather than invoking a compiler.
2. **Canonical source contract.** `test.html` must contain exactly one occurrence of each marker pair (`TEST-DEFINITIONS-BEGIN/END`, `TEST-HARNESS-BEGIN/END`), exactly one empty `<script id="test-completion">` element, and must not assign `window.__TEST_BUILD_META__` directly. Violations cause `BuildError` and exit code 1.
3. **Deterministic build metadata.** Every generated `test_standalone.html` embeds `window.__TEST_BUILD_META__ = {schemaVersion:"mahjong-test-result/v1", sourceHashes:{...}}` computed from SHA-256 of the three input files. The runner rejects payloads whose `sourceHashes` do not match the current source tree, preventing stale test execution.
4. **Strict completion schema enforcement.** Both runners validate the browser's JSON payload against a fixed schema with required fields (`schemaVersion`, `status`, `counts.discovered/executed/passed/failed/errors`, `invariant`, `executionMode`). Count arithmetic is checked (`discovered == executed == passed + failed + errors`); mismatched values raise a `CompletionError` and mark the run as infrastructure failure.
5. **Preservation baselines.** The harness hardcodes `PRESERVATION_CASE_IDS = ("canonical-063", "canonical-076", "canonical-093")` and asserts that the browser's `preservation` summary matches this frozen snapshot exactly — used to detect regressions in known cases.
6. **Auto/manual parity probing.** Each browser launch is executed twice: once with `?run=auto` and once with `?run=manual-probe`; the resulting verdict projections are compared byte-for-byte. Any divergence marks the run as a completion error.
7. **Evidence-first reporting.** All outcomes are written as JSON artifacts under `test-results/` using atomic write (write to `.tmp` then `replace()`). Exit codes encode status: 0 success, 1 test failure, 2 build failure, 3 no browser, 4 timeout, 5 infrastructure failure, 6 self-test failure.
8. **Protected material list.** `PROTECTED_PATHS` enumerates files/directories that must exist unchanged (`mj.html`, `mj.css`, `mj.js`, `mjConst.js`, `checkHandType.js`, `test.html`, `build_test.py`, `run_tests.py`, `.github`, `.kiro`, `README.md`, `LICENSE`, and the Vietnamese rules doc). Missing protected paths downgrade the run to `protected-material-missing`.
9. **Backend packaging convention.** The Java module follows the Spring Boot Maven archetype: `src/main/java/com/onevictoria/mahjong/...` with `model`, `repo`, `service`, `web` packages, and `src/main/resources/application*.properties` for environment-specific configuration (H2 default, PostgreSQL override).

## Conventions and constraints

- **No Node.js dependency:** The README-style comment in `run_tests.py` states the harness runs "without requiring Node.js." All tooling is pure Python.
- **Headless-only execution:** Browsers are always launched with `--headless --disable-gpu --no-sandbox --disable-dev-shm-usage --disable-extensions --disable-background-networking --disable-component-update --disable-default-apps --disable-sync --metrics-recording-only --no-first-run --no-default-browser-check` plus a per-run temporary `--user-data-dir`.
- **Browser discovery order:** `MJ_TEST_BROWSER` env var > explicit `--browser` argument > `PATH` lookup for `chrome`/`msedge` > standard Windows install locations under `PROGRAMFILES`/`LOCALAPPDATA`.
- **Timeout policy:** Default 90s per browser for the main harness, 120s for the scorekeeper harness; process trees are terminated via `taskkill /T /F` on Windows or `process.kill()` on POSIX.
- **Schema versions are pinned:** `mahjong-test-result/v1` for the main harness, `ov-mj-scorekeeper-tests/v1` for the scorekeeper harness, `mahjong-runner-evidence/v1` for evidence artifacts. Changing a schema without updating all consumers will fail validation.
- **Artifact immutability:** Generated outputs are written to `.tmp` then atomically replaced, ensuring readers never see partial JSON.
- **Spring Boot packaging:** The backend is built with `mvn package` (inherited from `spring-boot-starter-parent`), producing a fat JAR runnable via `java -jar`.