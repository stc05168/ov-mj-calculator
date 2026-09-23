---
kind: design
name: Centralized post-processing exclusion engine for hand type conflicts
source: session
category: adr
---

# Centralized post-processing exclusion engine for hand type conflicts

_Source: coding plans from commit period d069787 → 1814bb5 — records intent at planning time; the implementation may lag or differ._

**Status:** accepted

## Context
The mahjong scoring logic in `checkHandType.js` had ad-hoc, scattered exclusion logic (manual `splice` calls and embedded guards) that was unmaintainable and error-prone. With ~30 new hand types being added, the number of conflict rules grew too large to manage inline.

## Decision drivers
- maintainability of exclusion rules
- reducing regression risk when adding new hand types
- single source of truth for rule conflicts

## Considered options
- **Post-processing exclusion table (`EXCLUSION_RULES` + `applyExclusions`)** — pros: Declarative, centralized, easy to verify against the rules document; supports prefix matching for categories like '風牌'/'元牌'; replaces scattered splice/guard logic
- **Full registry/class-based refactor of detectors** _(rejected)_ — pros: Cleaner OOP structure; cons: Too disruptive — high regression risk for a scoring verification task
- **Pre-computation HandContext object passed to all detectors** _(rejected)_ — pros: Better performance via shared context; cons: Adds architectural change beyond scope; not needed yet
- **Embedded exclusion logic per detector (current approach)** _(rejected)_ — pros: No extra pass over results; cons: Unmaintainable and error-prone as rules grow; hard to audit

## Decision
Introduce a top-level `EXCLUSION_RULES` table and an `applyExclusions(handTypes)` function that runs after all detectors finish, removing conflicting hand types before sorting and returning results. This centralizes all conflict resolution in one place.

## Consequences
All existing manual `splice` exclusions (e.g., for 坎坎糊/5暗刻) and embedded guards are removed; new hand types only need to be declared and listed in the exclusion table if they conflict with others. The trade-off is an extra pass over the handTypes array, which is negligible given the small result set.