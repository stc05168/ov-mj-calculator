# Implementation Plan

- [x] 1. Write the strict bug-condition exploration test and Node-independent execution path
  - **Property 1: Bug Condition** - Taiwan Mahjong v2.7 amended scoring and complete-suite execution
  - **CRITICAL**: Complete this task before changing production scoring logic in `checkHandType.js`; the amended scoring assertions MUST fail on unfixed behavior wherever the bug exists, and those failures are evidence rather than a reason to weaken the tests.
  - Record the existing working-tree diff for `checkHandType.js` and treat its partial 嚦咕嚦咕 branch as unverified pre-existing work; do not reset, overwrite, or assume that branch is correct while establishing the red tests.
  - In canonical `test.html`, replace the permissive reciprocal-prefix/name-only oracle with an explicit assertion schema for exact required `(name, score)` results, optional prohibited names/results, allowed multiplicity, and an opt-in matcher used only by genuinely parameterized names such as `純全帶X(...)`.
  - Add oracle probes proving that wrong scores, undeclared broad-prefix matches, missing required results, prohibited results, and duplicate targeted results fail.
  - Add explicit deterministic v2.7 fixtures for all seven no-honor conditions in `isBugCondition(input)`: 斷么, 純全帶么九, 清老頭/清么碰, 缺一門, parameterized 純全帶X, 小於五, and 缺五. Each fixture must assert its exact target result and separately prohibit both `無字` and `無字花`.
  - Add valid 嚦咕嚦咕 fixtures for three distinct wind pairs, all three dragon pairs, and all four wind pairs. Require `小三風(10)`, `小三元(15)`, and `小四喜(40)` respectively; prohibit the same name at 20/30/80, duplicate targeted entries, and coincidental success from an invalid 嚦咕 fixture.
  - Use a scoped property-based approach with deterministic generators/seeds: generate valid hands within each amended family, assert the corresponding `expectedBehavior(result)` inclusion/exclusion predicate, and retain every counterexample seed without adding an unapproved dependency.
  - Strengthen `runAllTests` accounting to track stable case IDs plus `discovered`, `executed`, `passed`, `failed`, and `errors` separately. Every discovered case must execute exactly once; a setup/detector exception counts as an executed error, never an assertion failure or pass.
  - Make `test.html` emit one schema-versioned machine-readable completion payload and support explicit auto-run while retaining manual interactive execution.
  - Update `build_test.py` to derive definitions and the exact same assertion/reporting semantics from `test.html`, reject missing/duplicate markers and empty/malformed extraction, produce deterministic UTF-8 output, and never embed a stale result. Do not create a second canonical test list.
  - Add `run_tests.py` as the strict local orchestrator: invoke `build_test.py` with Python; discover an explicitly configured browser, then `PATH`, then standard Windows Chrome and Edge locations; serve over loopback on an ephemeral port; launch a fresh temporary profile with a hard timeout; parse only the dedicated completion payload; and return nonzero for build, browser, timeout, malformed/incomplete evidence, test-failure, or test-error outcomes. It must never invoke or assume globally installed Node.js.
  - In temporary/probe copies, test discovered/executed mismatch, assertion failure, thrown error, missing/duplicate/malformed completion, stale completion, browser startup failure, and timeout. Permit Chrome/Edge fallback only for infrastructure startup failure, never to hide a genuine test failure.
  - Execute the strict path with global Node unavailable and execute Chrome and Edge independently where each is installed; record unavailable browsers explicitly rather than silently claiming cross-browser coverage.
  - Run the strict amended matrix against the UNFIXED scoring code, capture pre-exclusion candidates and final results for every fixture, and document exact counterexamples by stable test ID, seed/setup, expected results, prohibited results found, actual results, and whether the defect is in the fixture, detector, score selection, exclusion, oracle, or runner.
  - **EXPECTED OUTCOME**: The strengthened harness/runner probes pass, while one or more amended scoring cases fail and thereby expose the bug. Do not alter scoring code or relax assertions in this task.
  - Mark this task complete only when the failure-first execution is reproducible and every amended condition has either a documented counterexample or documented evidence that the pre-existing partial change already satisfies that condition and therefore requires preservation rather than replacement.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 1.14_

- [x] 2. Write preservation property tests on unfixed behavior
  - **Property 2: Preservation** - Ordinary 20/30/80 scoring, unaffected canonical behavior, and protected repository material
  - **IMPORTANT**: Follow observation-first methodology before changing production scoring: run non-bug-condition inputs through the current F, record the actual normalized names, scores, exclusions, multiplicity, and order, then encode those observed outputs as the preservation baseline.
  - Add separate valid non-嚦咕 fixtures for ordinary `小三風(20)`, `小三元(30)`, and `小四喜(80)`; assert exact score, no special-score duplicate, and non-嚦咕 classification.
  - Add deterministic property/differential coverage for valid bounded hands and states where `isBugCondition(input)` is false. Persist seeds and normalized F outputs so F' can be compared without conflating ordering, multiplicity, or exclusions.
  - Snapshot stable IDs for every pre-existing canonical test and verify each remains enabled, unique, discovered, and executed; do not delete, skip, selectively omit, or weaken an existing valid assertion to obtain a pass.
  - Verify manual `test.html` execution and strict auto-run report the same verdict and counts for preservation cases.
  - Record protected paths and references before cleanup work: application source (`mj.html`, `mj.css`, `mj.js`, `mjConst.js`, `checkHandType.js`), canonical `test.html`, `build_test.py`, the validated runner, `.github` deployment configuration, `.kiro` specifications, useful documentation/support, and `../台灣牌規則_OV_2.7.docx`.
  - Capture the current partial `checkHandType.js` diff and baseline outputs without reverting it. Preservation compares against the actual pre-fix working state while amendment correctness remains governed by the v2.7 expected behavior, not by unverified changed lines.
  - Run these tests on UNFIXED code and require them to pass. If a supposed preservation case fails, document it and reclassify it as a bug-condition counterexample before implementation rather than changing the expected baseline silently.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Fix all identified root causes without weakening coverage

  - [x] 3.1 Diagnose strict-suite counterexamples and establish the minimal correction set
    - Correlate each task 1 failure with its test setup, raw pre-exclusion candidates, final post-exclusion output, and the 05-FEB-2026 v2.7 rule reference.
    - Classify failures as invalid fixture, detector defect, score-selection defect, exclusion key/alias/prefix defect, exclusion ordering defect, assertion-harness defect, or execution-infrastructure defect; re-hypothesize when evidence disproves the design hypothesis.
    - Review the pre-existing partial `checkHandType.js` diff line by line. Preserve correct unrelated changes, modify only lines disproven by strict fixtures, and never use checkout/reset or a whole-file replacement that discards existing work.
    - Define the smallest file/function-level corrections before editing: `test.html` fixtures only when the fixture is invalid under v2.7, `build_test.py`/`run_tests.py` only for demonstrated execution defects, and `checkHandType.js` only for demonstrated scoring defects.
    - _Bug_Condition: `isBugCondition(input)` is true for any strict scoring, coverage, execution, or evidence defect surfaced by task 1_
    - _Expected_Behavior: `expectedBehavior(result)` requires exact amended results, prohibited-result absence, complete counts, and a Node-independent unambiguous result_
    - _Preservation: Keep the observed F behavior for non-amended inputs and preserve all valid canonical tests and pre-existing work not disproven by evidence_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Correct the seven v2.7 no-honor exclusions at their owning root causes
    - For each failing target—斷么, 純全帶么九, 清老頭/清么碰, 缺一門, parameterized 純全帶X, 小於五, and 缺五—fix the owning detector, emitted-name mapping, `EXCLUSION_RULES` entry, narrow prefix handling, or `applyExclusions` ordering identified in task 3.1.
    - Keep no-honor non-stacking centralized in `EXCLUSION_RULES`/`applyExclusions` unless evidence proves that model insufficient; verify the 清老頭 rule alias against the emitted `清么碰` name and constrain `純全帶X(...)` matching to that declared family.
    - Apply exclusions once to the complete candidate set, remove both `無字` and `無字花` only when an amended target is present, and preserve deterministic result order and unrelated allowed additions.
    - Do not add a broad exclusion or change a rule score merely to make a fixture pass; repair invalid fixtures only when candidate/final-result evidence and the rule reference prove the setup is wrong.
    - _Bug_Condition: amended no-honor target present and final results contain `無字` or `無字花`_
    - _Expected_Behavior: the exact amended target remains while both prohibited no-honor bonuses are absent_
    - _Preservation: unrelated result sets and all non-amended names, scores, exclusions, multiplicity, and ordering remain unchanged_
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.4_

  - [x] 3.3 Validate and minimally correct the partial 嚦咕嚦咕 honor implementation
    - Use the task 1 counterexamples to validate full-winning-hand tile semantics, exact pair counting, quads, winning-tile participation, `isLiguligu`, and `isEightPairs`; do not accept the current inline code solely because it is already present.
    - Prefer one structured 嚦咕 classification computed once per detection with explicit distinct wind-pair and dragon-pair counts. Select `小三風(10)`, `小三元(15)`, or `小四喜(40)` only for a valid 嚦咕 hand satisfying the exact amendment condition.
    - Prevent duplicate targeted names and simultaneous special/ordinary scores; non-嚦咕 and near-miss structures must defer to the unchanged ordinary wind/dragon detectors.
    - Preserve any correct portions of the existing partial change and keep the diff minimal and reviewable.
    - _Bug_Condition: a valid 嚦咕 pair structure lacks its exact 10/15/40 result, receives 20/30/80, or produces a duplicate/wrong classification_
    - _Expected_Behavior: exact special scores are emitted once for qualifying 嚦咕 hands_
    - _Preservation: ordinary non-嚦咕 `小三風(20)`, `小三元(30)`, and `小四喜(80)` remain unchanged_
    - _Requirements: 2.9, 2.10, 2.11, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.4 Resolve every remaining strict-suite failure or error by root cause
    - Re-run the complete strict suite after each coherent correction batch and investigate every remaining stable test ID; do not bulk-update expected values, add permissive matching, catch-and-ignore errors, or remove/skip tests.
    - If implementation contradicts v2.7, fix the owning production logic; if a canonical fixture or expectation is demonstrably invalid, correct it while retaining the intended rule coverage and document the rule evidence.
    - Keep browser infrastructure failures distinct from scoring failures, and keep assertion failures distinct from test exceptions in both process status and evidence.
    - _Bug_Condition: any discovered canonical case fails/errors, any case is omitted, or execution/evidence is ambiguous_
    - _Expected_Behavior: all exact assertions and count invariants hold through the strict Node-independent path_
    - _Preservation: all valid existing canonical cases stay enabled and strongly asserted_
    - _Requirements: 2.1, 2.12, 2.13, 2.14, 3.4, 3.5_

  - [x] 3.5 Verify the bug-condition exploration test now passes
    - **Property 1: Expected Behavior** - Taiwan Mahjong v2.7 amended scoring and complete-suite execution
    - **IMPORTANT**: Re-run the SAME amended/property tests and runner probes from task 1; do not replace them with easier tests.
    - Require exact target inclusion and prohibited-result absence for all seven no-honor families and exact non-duplicated 10/15/40 results for all three valid 嚦咕 families.
    - Require the Node-independent runner’s completion schema and count invariants to pass, while the deliberate temporary failure/error/incomplete probes still return nonzero.
    - Execute Chrome and Edge independently where installed and record an explicit unavailable status where one is absent.
    - **EXPECTED OUTCOME**: The task 1 scoring tests now pass and the negative runner probes remain correctly rejected.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Ordinary 20/30/80 scoring, unaffected canonical behavior, and protected repository material
    - **IMPORTANT**: Re-run the SAME ordinary fixtures, deterministic seeds, stable test-ID checks, and manual/auto parity checks from task 2; do not write replacement tests after seeing F'.
    - Differentially compare normalized F and F' for every retained non-amended seed and require ordinary `小三風(20)`, `小三元(30)`, and `小四喜(80)` to remain exact and non-duplicated.
    - Confirm every valid pre-existing canonical test remains enabled, unique, discovered, executed, and at least as strongly asserted as its baseline form.
    - **EXPECTED OUTCOME**: All preservation tests pass with no unexplained differential.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Run the complete suite to zero failures and zero errors before cleanup
  - Run `run_tests.py` from a clean generated test page and fresh temporary browser profile with global Node unavailable; require `discovered = executed = passed`, `failed = 0`, `errors = 0`, a success payload, and process exit code zero.
  - Repeat the complete run from another fresh profile to prove repeatability and ensure the second run cannot reuse stale completion data.
  - Run the complete suite independently in Chrome and Edge where installed. If a browser is unavailable, preserve explicit discovery evidence; if it is available, any browser-specific failure blocks cleanup.
  - Continue diagnosing and fixing root causes under task 3 until the complete suite reaches zero failures and zero errors; never change or weaken an expectation solely to force this checkpoint green.
  - Verify the pre-clean evidence records timestamp, source revision or source hashes, invocation path, browser identity/version, stable test IDs, and discovered/executed/passed/failed/error totals.
  - Do not begin artifact deletion until this checkpoint passes. Ask the user if a rule interpretation or protected-file classification remains uncertain.
  - _Requirements: 2.1, 2.12, 2.13, 2.14, 3.5_

- [x] 5. Clean only artifacts confirmed stale, generated, duplicate, or diagnostic
  - Inventory every candidate with provenance, repository references, deployment use, unique diagnostic/support value, reproducibility, and a preserve/delete decision; perform a dry run and default every uncertain item to preserve.
  - Investigate, but do not automatically delete, generated/stale result candidates (`test_standalone.html`, `test_output*.html`, `full_output*.html`, `test_results.txt`, `results*.txt`, `failures.txt`), diagnostics (`debug*.html`, `debug_test.js`, `*_screenshot*.png`), and legacy/duplicate runners (`run_tests.js`, `run_tests_hta.hta`, `test_runner.html`, `check_tests.py`, `check_tests2.py`).
  - Remove a candidate only after proving it is unused and either reproducibly generated, stale, duplicate, or diagnostic, and after proving the validated Python/browser path supersedes any useful runner behavior.
  - Preserve unconditionally all application source, canonical `test.html`, `build_test.py`, `run_tests.py`, `.github` deployment files, `.kiro` specifications, the v2.7 rule document, license/useful documentation, and any uniquely useful support file. Do not edit, relocate, or delete `../台灣牌規則_OV_2.7.docx`.
  - Verify GitHub Pages/application references remain valid; a path referenced by deployment, source, canonical tests, or retained authoritative documentation is not a cleanup candidate.
  - Update `.gitignore` only for proven reproducible transient build/output files. Retain one clearly named fresh machine-readable evidence record (for example `test-results/latest.json`) and do not treat screenshots or historical output as authority.
  - _Bug_Condition: stale/duplicate/generated/diagnostic artifacts obscure authority, or a cleanup plan would remove protected/uncertain material_
  - _Expected_Behavior: only confirmed obsolete artifacts are removed and one organized reproducible evidence path remains_
  - _Preservation: source, canonical tests, validated infrastructure, deployment/specification files, rule references, and useful unique support/evidence are retained_
  - _Requirements: 2.15, 3.6, 3.7_

- [x] 6. Final checkpoint - Rerun all tests after cleanup and preserve fresh evidence
  - Rebuild from canonical `test.html`; rerun the entire suite through `run_tests.py` with a fresh profile and global Node unavailable. Require `discovered = executed = passed`, `failed = 0`, `errors = 0`, success status, and exit code zero.
  - Rerun independently in Chrome and Edge where installed, using no cross-browser fallback to mask a real failure; record explicit browser availability and identity.
  - Atomically replace the retained latest evidence with this post-cleanup run so an older pass cannot remain current after a failed, timed-out, malformed, or incomplete attempt. Include timestamp, source revision/hashes, command/execution path, browser/version, stable amendment and ordinary-comparison test IDs, counts, status, and any failure/error details.
  - Confirm all seven v2.7 exclusion tests, all three 嚦咕 10/15/40 tests, and all ordinary non-嚦咕 20/30/80 regressions are present and executed in the final evidence.
  - Compare canonical test IDs with the pre-fix snapshot, run an application/deployment smoke check, and verify protected source, canonical tests, `.github`, `.kiro`, and the supplied rule reference remain present and usable after cleanup.
  - Mark the bugfix complete only after the post-cleanup run has zero failures/errors and the retained evidence is fresh, internally consistent, reproducible, and unambiguous.
  - _Requirements: 2.1, 2.12, 2.13, 2.14, 2.15, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
