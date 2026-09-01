# Rules and Scoring Behavior

## 1. Scope and authority

This document explains how the calculator applies rules; it is not a complete reproduction of the external rule book. The implementation is aligned with the project's Taiwan Mahjong v2.7 reference, stored in the development workspace as:

```text
../台灣牌規則_OV_2.7.docx
```

The source-of-truth order is:

1. The supplied v2.7 rule reference for rule intent.
2. Canonical `test.html` for executable expected results and regression behavior.
3. `checkHandType.js` for current scoring implementation.
4. This document for maintained explanation.

If prose and executable behavior disagree, investigate the rule reference, canonical fixture, and implementation together rather than silently changing an expected score.

## 2. Hand model

The calculator models a Taiwan Mahjong winning hand using:

- concealed hand tiles;
- one winning tile;
- exposed chows and pungs;
- open and concealed kongs;
- flowers;
- seat and round winds;
- dealer and repeat-dealer state; and
- situational flags such as self-draw, ready declarations, kong wins, and last-tile wins.

A normal winning hand requires 17 physical tiles. Every kong increases the expected physical count by one.

## 3. Scoring pipeline

The scoring engine follows four stages:

1. **Collect input**: `mj.js` combines concealed tiles, melds, kongs, and the winning tile.
2. **Detect candidates**: `detectHandTypes()` evaluates special hands, composition rules, sets, waits, honors, flowers, and situational conditions.
3. **Apply exclusions**: `applyExclusions()` removes results that cannot stack with a stronger or combined result.
4. **Post-process**: low-value 大雞糊/鴨糊 handling is applied where required, final results are ordered, and the UI adds dealer-related fan.

The result list therefore represents final stackable items, not every raw predicate that matched the hand.

## 4. Name matching and parameterized results

Most scoring results have exact names. Some include a parameter or multiplier, for example:

- `風牌(東)`
- `純全帶7`
- `二相逢x1`

The engine uses narrowly controlled exact-or-family matching for exclusions. Canonical tests require exact name and score pairs by default. Prefix/family matching is opt-in only for genuinely parameterized result names.

## 5. v2.7 no-honor non-stacking amendment

When any of the following seven target patterns is present, the final result must not also contain `無字` or any `無字花...` result:

1. `斷么`
2. `純全帶么九`
3. `清么碰` (the emitted all-terminals family name)
4. `缺一門`
5. parameterized `純全帶X`
6. `小於五`
7. `缺五`

This is an exclusion rule, not a score substitution. The target result remains, while the prohibited no-honor bonus is removed.

Canonical coverage contains two deterministic cases per family:

- a no-flower case (`-nf`); and
- a one-flower case (`-f1`).

The 14 stable IDs are:

```text
v27-no-honor-duanyao-nf
v27-no-honor-duanyao-f1
v27-no-honor-pure-terminal-nf
v27-no-honor-pure-terminal-f1
v27-no-honor-all-terminals-nf
v27-no-honor-all-terminals-f1
v27-no-honor-missing-suit-nf
v27-no-honor-missing-suit-f1
v27-no-honor-pure-quan-dai-x-nf
v27-no-honor-pure-quan-dai-x-f1
v27-no-honor-less-than-five-nf
v27-no-honor-less-than-five-f1
v27-no-honor-missing-five-nf
v27-no-honor-missing-five-f1
```

Each case requires the amended target and separately prohibits exact `無字` plus the `無字花` family.

## 6. v2.7 嚦咕嚦咕 honor-pair amendment

For a qualifying 嚦咕嚦咕 pair-composition hand, the honor-pair patterns use these values:

| Pair composition | Required result | Prohibited ordinary value | Stable test ID |
|---|---:|---:|---|
| Three distinct wind pairs | `小三風(10)` | `小三風(20)` | `v27-ligu-small-three-winds` |
| All three dragon pairs | `小三元(15)` | `小三元(30)` | `v27-ligu-small-three-dragons` |
| All four wind pairs | `小四喜(40)` | `小四喜(80)` | `v27-ligu-small-four-winds` |

A targeted name may appear only once. A qualifying pair hand must not emit both the special and ordinary value.

These amendments are deliberately scoped to valid 嚦咕嚦咕 structures. They do not globally change ordinary wind/dragon scoring.

## 7. Ordinary honor-pattern preservation

Valid non-嚦咕 hands retain the ordinary values:

| Ordinary structure | Preserved result | Canonical baseline |
|---|---:|---|
| Small three winds | `小三風(20)` | `canonical-063` |
| Small three dragons | `小三元(30)` | `canonical-076` |
| Small four winds | `小四喜(80)` | `canonical-093` |

The final browser evidence checks these three ordered baselines, prohibits special-value duplicates, and confirms non-嚦咕 classification.

## 8. Exclusion behavior

`EXCLUSION_RULES` in `checkHandType.js` centralizes non-stacking relationships. Important properties are:

- exclusions are applied to the complete candidate set;
- a triggering result is not allowed to remove itself;
- dynamic result names are mapped only to their declared rule family;
- unrelated scoring entries remain unchanged; and
- deterministic multiplicity and result ordering are preserved.

When adding or changing a combined hand type, update the owning detector and exclusion mapping rather than filtering results ad hoc in the UI.

## 9. 大雞糊 and 鴨糊 processing

The engine treats named situational rewards separately from ordinary hand fan. When the non-reward total falls within the implemented low-score threshold:

- a discard win is represented by `大雞糊(30)`; or
- a self-draw win is represented by `鴨糊(10)`.

Applicable reward entries are retained. This processing occurs after ordinary candidate detection and exclusions.

## 10. Exact assertions and multiplicity

Canonical tests define required results using:

- exact name;
- exact score;
- matcher type;
- minimum count; and
- maximum count.

They may also define prohibited names/results. A case fails when an expected result is missing, has the wrong score, occurs too many times, or coexists with a prohibited result. Detector exceptions are recorded as errors, not assertion failures.

This distinction prevents a broad name match or coincidental duplicate from making an incorrect hand pass.

## 11. Adding or interpreting a rule

Before changing scoring behavior:

1. Identify the exact section in the v2.7 reference.
2. Create or update a structurally valid fixture in canonical `test.html`.
3. Record the required exact result and all prohibited alternatives.
4. Run the fixture against current behavior and classify the difference as a fixture, detector, score, exclusion, or runner issue.
5. Make the smallest correction in `checkHandType.js`.
6. Run the complete Chrome/Edge suite and preservation baselines.

See [Testing](TESTING.md) and [Contributing](../CONTRIBUTING.md).
