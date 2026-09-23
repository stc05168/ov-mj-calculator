---
kind: design
name: State-driven UI toggles for situational fan conditions
source: session
category: adr
---

# State-driven UI toggles for situational fan conditions

_Source: coding plans from commit period d069787 → 1814bb5 — records intent at planning time; the implementation may lag or differ._

**Status:** accepted

## Context
Many mahjong fan types depend on game-state flags (自摸, 一發, 海底撈月, 天糊/地糊, 多響, etc.) that previously had no UI controls, making it impossible to score hands with these conditions without modifying code.

## Decision drivers
- user configurability of situational fans
- extensibility for future state flags
- separation of detection logic from input capture

## Considered options
- **Add boolean/numeric state fields in `mj.js` plus grouped checkbox/dropdown UI in `mj.html`** — pros: Keeps each flag explicit and typed; groups related flags logically; minimal coupling to detection code
- **Hardcode defaults or derive state from tile layout alone** _(rejected)_ — pros: Less UI work; cons: Cannot represent events like 搶槓, 天糊, 多響 that aren't derivable from tiles alone

## Decision
Extend the `state` object in `mj.js` with explicit boolean/numeric fields for each situational condition (isDeclaredReady, isIppatsu, isLastTileDraw, isRobbingKong, isTenhou, isMultiWin, visibleWinTileCount, etc.) and expose them as grouped checkboxes/dropdowns under a new '特殊條件' section in `mj.html`. Detection functions then read these flags directly.

## Consequences
Each new situational fan requires one new state field and one UI control; detection stays declarative. Users can now score any hand by toggling the appropriate flags rather than editing source code.