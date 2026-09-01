# Contributing

## Project principles

Contributions should preserve scoring correctness, explicit rule provenance, strong tests, deterministic evidence, and the dependency-free browser architecture.

Do not weaken, skip, delete, or broadly match a valid test merely to make a change pass.

## Development setup

Requirements:

- a text editor;
- Python 3 for local serving and tests; and
- Chrome and/or Edge for automated browser execution.

Node.js and npm are not required.

Start the application locally:

```bat
python -m http.server 8000
```

Open `http://127.0.0.1:8000/mj.html`.

## Read before changing code

- [README](README.md)
- [User Guide](docs/USER_GUIDE.md)
- [Rules](docs/RULES.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Testing](docs/TESTING.md)
- `../台灣牌規則_OV_2.7.docx` when working on scoring behavior

The completed `.kiro/specs/` documents provide internal design history. Generated `.qoder` wiki pages may be stale and are not authoritative.

## Source and generated files

Edit canonical source files:

```text
mj.html
mj.css
mjConst.js
mj.js
checkHandType.js
test.html
build_test.py
run_tests.py
README.md
docs/*.md
CONTRIBUTING.md
```

Do not hand-edit generated artifacts:

```text
test_standalone.html
test-results/latest.json
__pycache__/
```

Use this tracking policy:

- `test_standalone.html` is a tracked generated artifact. Regenerate and include it when canonical test sources or `build_test.py` change; verify its diff is explainable.
- `test-results/latest.json` is release evidence. Include fresh evidence with a completed scoring/test release when evidence retention is intended. A local untracked copy is not available to a fresh clone and must not be described as repository history.
- Documentation-only changes do not need new browser evidence unless they change documented behavior or commands.
- `__pycache__/` is transient and must remain untracked.

## General change workflow

1. Inspect the current behavior and relevant tests.
2. Make the smallest coherent source change.
3. Update canonical tests when behavior intentionally changes.
4. Update maintained documentation when user-visible behavior or commands change.
5. Run targeted checks during development.
6. Run the automated scoring validation and the applicable manual application smoke checks before requesting review.
7. Review `git diff` and `git status` to ensure only intended files changed.

## Scoring-rule changes

For every scoring change:

1. Cite the applicable v2.7 rule section or approved interpretation.
2. Construct a structurally valid complete hand.
3. Add or update a stable case in canonical `test.html`.
4. Require an exact `(name, score)` result.
5. Prohibit obsolete, mutually exclusive, or wrong-score alternatives.
6. Set multiplicity bounds to reject duplicates.
7. Capture deterministic seed/setup metadata where applicable.
8. Diagnose whether the issue belongs to the fixture, detector, score selection, exclusion, assertion harness, or runner.
9. Correct the owning logic in `checkHandType.js` rather than filtering output in the UI.
10. Confirm ordinary preservation cases and all canonical IDs remain green.

Keep cross-rule suppression centralized in `EXCLUSION_RULES` and `applyExclusions()` unless evidence proves that design cannot express the rule.

## UI changes

The automated scoring suite supplies its own state shim and does not load `mj.html`, `mj.js`, or `mj.css`. When adding or changing a control:

- update semantic markup in `mj.html`;
- update state and event handling in `mj.js`;
- update responsive/interaction styles in `mj.css`;
- update scoring logic only if the control changes rule input;
- manually smoke-test page load, tile entry, inferred chow/pung/kong creation, winning-tile assignment, undo/clear, settings, score rendering, and browser-console errors;
- test click and keyboard-reachable controls where applicable, plus drag/drop and touch for interaction changes; and
- update the User Guide.

Preserve the runtime script order: `mjConst.js`, `mj.js`, then `checkHandType.js`.

## Test protocol changes

Treat the completion/evidence protocol as a versioned interface. If changing it:

- update the schema version when compatibility changes;
- keep exactly one completion payload;
- retain source-hash freshness checks;
- keep discovered/executed/passed/failed/errors separate;
- keep assertion failures distinct from exceptions;
- retain negative rejection probes; and
- validate both automatic and manual-probe execution.

## Required validation

Run runner self-tests:

```bat
python -u run_tests.py --self-test
```

Run the full supported browser matrix:

```bat
python -u run_tests.py --browser all --timeout 120
```

A complete result requires, for each installed requested browser:

```text
discovered = executed = passed
failed = 0
errors = 0
status = success
```

Also confirm:

- manual/automatic parity passes;
- original canonical inventory remains 117/117 unless an explicitly approved migration changes it;
- preservation cases remain 3/3;
- all v2.7 amendment IDs remain present;
- protected source and rule material remain available; and
- `test-results/latest.json` corresponds to current canonical source hashes.

## Commit and review guidance

Keep commits focused and describe:

- the user-visible or rule-level problem;
- root cause;
- exact correction;
- tests added or changed;
- full browser totals; and
- documentation impact.

Do not commit unrelated debug output, screenshots, caches, browser profiles, or temporary generated reports.

Reviewers should prioritize rule correctness, fixture validity, exclusion scope, preservation behavior, test strictness, and generated-evidence freshness over formatting-only concerns.

## Reporting a scoring discrepancy

Include:

- complete concealed hand;
- winning tile;
- all exposed sets and kongs;
- flowers;
- seat and round wind;
- dealer/repeat count;
- all selected special flags;
- actual result list and total;
- expected result list and total;
- rule-reference section; and
- browser/test case ID if available.

This information is necessary to distinguish a scoring defect from an incomplete input or local-rule difference.

## License

By contributing, you agree that your contribution is provided under the repository's [MIT License](LICENSE).
