# Bugfix Requirements Document

## Introduction

This bugfix aligns Taiwan Mahjong hand-type scoring and the complete test suite with the supplied `台灣牌規則_OV_2.7.docx`, specifically amendment v2.7 dated 05-FEB-2026. The bug condition covers any execution in which an existing test fails or errors, an amended no-honor combination receives prohibited additional scoring, a 嚦咕嚦咕 honor-pair combination receives the wrong special value, the test suite cannot be executed reliably without a globally installed Node.js runtime, or completion and cleanup cannot be demonstrated safely. The fix is complete only when every valid existing test and every amendment-specific test passes through a repeatable executable path, with ordinary non-嚦咕 behavior preserved.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the complete existing test suite is executed against the current scoring behavior THEN the system reports one or more failures or errors instead of a complete pass.

1.2 WHEN a winning hand qualifies for 斷么 and also has no honor tiles or no honor/flower tiles THEN the system can additionally score 無字 or 無字花 contrary to amendment v2.7.

1.3 WHEN a winning hand qualifies for 純全帶么九 and also has no honor tiles or no honor/flower tiles THEN the system can additionally score 無字 or 無字花 contrary to amendment v2.7.

1.4 WHEN a winning hand qualifies for 清老頭, also named 清么碰, and also has no honor tiles or no honor/flower tiles THEN the system can additionally score 無字 or 無字花 contrary to amendment v2.7.

1.5 WHEN a winning hand qualifies for 缺一門 and also has no honor tiles or no honor/flower tiles THEN the system can additionally score 無字 or 無字花 contrary to amendment v2.7.

1.6 WHEN a winning hand qualifies for any parameterized 純全帶X result and also has no honor tiles or no honor/flower tiles THEN the system can additionally score 無字 or 無字花 contrary to amendment v2.7.

1.7 WHEN a winning hand qualifies for 小於五 and also has no honor tiles or no honor/flower tiles THEN the system can additionally score 無字 or 無字花 contrary to amendment v2.7.

1.8 WHEN a winning hand qualifies for 缺五 and also has no honor tiles or no honor/flower tiles THEN the system can additionally score 無字 or 無字花 contrary to amendment v2.7.

1.9 WHEN a 嚦咕嚦咕 hand contains pairs of three distinct winds THEN the current unverified behavior does not reliably establish the amendment-specific 小三風 value of 10.

1.10 WHEN a 嚦咕嚦咕 hand contains pairs of all three dragons THEN the current unverified behavior does not reliably establish the amendment-specific 小三元 value of 15.

1.11 WHEN a 嚦咕嚦咕 hand contains pairs of all four winds THEN the current unverified behavior does not reliably establish the amendment-specific 小四喜 value of 40.

1.12 WHEN the test suite must run in an environment without a globally installed Node.js runtime THEN the available process does not provide a single reliable, repeatable executable path that runs every canonical test case.

1.13 WHEN test completion is assessed from the current generated output and result artifacts THEN the available evidence does not prove that every discovered test executed with zero failures and zero errors.

1.14 WHEN amendment v2.7 compliance is evaluated THEN the existing test coverage does not conclusively verify every prohibited 無字/無字花 combination, each 嚦咕嚦咕 special value, and the corresponding ordinary non-嚦咕 values.

1.15 WHEN obsolete, duplicate, generated, or diagnostic artifacts remain after test work THEN stale files can obscure the canonical source, canonical tests, and authoritative pass result.

### Expected Behavior (Correct)

2.1 WHEN the complete existing test suite is executed after the fix THEN the system SHALL run every valid test case and report zero failures and zero errors.

2.2 WHEN a winning hand qualifies for 斷么 and also has no honor tiles or no honor/flower tiles THEN the system SHALL score 斷么 without additionally scoring 無字 or 無字花, as required by amendment v2.7 dated 05-FEB-2026.

2.3 WHEN a winning hand qualifies for 純全帶么九 and also has no honor tiles or no honor/flower tiles THEN the system SHALL score 純全帶么九 without additionally scoring 無字 or 無字花, as required by amendment v2.7 dated 05-FEB-2026.

2.4 WHEN a winning hand qualifies for 清老頭, also named 清么碰, and also has no honor tiles or no honor/flower tiles THEN the system SHALL score 清老頭/清么碰 without additionally scoring 無字 or 無字花, as required by amendment v2.7 dated 05-FEB-2026.

2.5 WHEN a winning hand qualifies for 缺一門 and also has no honor tiles or no honor/flower tiles THEN the system SHALL score 缺一門 without additionally scoring 無字 or 無字花, as required by amendment v2.7 dated 05-FEB-2026.

2.6 WHEN a winning hand qualifies for any parameterized 純全帶X result and also has no honor tiles or no honor/flower tiles THEN the system SHALL score that 純全帶X result without additionally scoring 無字 or 無字花, as required by amendment v2.7 dated 05-FEB-2026.

2.7 WHEN a winning hand qualifies for 小於五 and also has no honor tiles or no honor/flower tiles THEN the system SHALL score 小於五 without additionally scoring 無字 or 無字花, as required by amendment v2.7 dated 05-FEB-2026.

2.8 WHEN a winning hand qualifies for 缺五 and also has no honor tiles or no honor/flower tiles THEN the system SHALL score 缺五 without additionally scoring 無字 or 無字花, as required by amendment v2.7 dated 05-FEB-2026.

2.9 WHEN a 嚦咕嚦咕 hand contains pairs of three distinct winds THEN the system SHALL additionally score the special 小三風 at 10.

2.10 WHEN a 嚦咕嚦咕 hand contains pairs of all three dragons THEN the system SHALL additionally score the special 小三元 at 15.

2.11 WHEN a 嚦咕嚦咕 hand contains pairs of all four winds THEN the system SHALL additionally score the special 小四喜 at 40.

2.12 WHEN the test suite is run in the known environment without a globally installed Node.js runtime THEN the system SHALL provide a reliable, repeatable executable test path that uses available or project-contained capabilities, does not assume global Node.js, runs every canonical test case, and returns an unambiguous success or failure result.

2.13 WHEN the final complete test run finishes THEN the system SHALL retain reproducible pass evidence identifying the executed test total, pass total, failure total, error total, execution path, and a result of zero failures and zero errors.

2.14 WHEN amendment v2.7 compliance tests are executed THEN the system SHALL include explicit cases for all seven prohibited 無字/無字花 combinations, the three 嚦咕嚦咕 special values, and ordinary non-嚦咕 comparison cases.

2.15 WHEN repository cleanup is performed after successful validation THEN the system SHALL remove only confirmed unused, duplicate, stale, generated, or diagnostic artifacts; preserve source, canonical tests, deployment configuration, the supplied rule amendment, and useful retained evidence; and leave retained files clearly organized without relying on stale outputs as proof.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a non-嚦咕 hand qualifies for ordinary 小三風 THEN the system SHALL CONTINUE TO score 小三風 at 20.

3.2 WHEN a non-嚦咕 hand qualifies for ordinary 小三元 THEN the system SHALL CONTINUE TO score 小三元 at 30.

3.3 WHEN a non-嚦咕 hand qualifies for ordinary 小四喜 THEN the system SHALL CONTINUE TO score 小四喜 at 80.

3.4 WHEN a hand does not satisfy any amended bug condition THEN the system SHALL CONTINUE TO return the same valid hand-type names, values, exclusions, and ordering required by the supplied Taiwan Mahjong rules and established canonical tests.

3.5 WHEN valid existing tests are incorporated into the final suite THEN the system SHALL CONTINUE TO execute them without deletion, disabling, selective omission, or weakened assertions merely to obtain a passing result.

3.6 WHEN source files, canonical test definitions, deployment configuration, or the supplied `台灣牌規則_OV_2.7.docx` are encountered during cleanup THEN the system SHALL CONTINUE TO preserve them.

3.7 WHEN useful non-generated support files or reproducible validation evidence are retained THEN the system SHALL CONTINUE TO keep them available in an organized, non-ambiguous form.
