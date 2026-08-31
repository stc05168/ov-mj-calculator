---
kind: error_handling
name: User-Facing Validation via Status Messages and Browser Alerts
category: error_handling
scope:
    - '**'
source_files:
    - mj.js
    - checkHandType.js
    - mjConst.js
---

## Error Handling Approach

This is a single-page browser Mahjong hand scoring calculator with no server-side layer, no framework, and no dedicated error-handling infrastructure. Errors are handled entirely on the client side through **user-facing validation** rather than exception propagation.

### What System/Approach Is Used

- **No custom error types or sentinel errors.** There are no `Error` subclasses, error codes, or structured error objects anywhere in the codebase.
- **No try/catch blocks for business logic.** The only `try/catch` appears around drag-and-drop drop handlers (`handleTouchEndDropZone`, line 364–369), which catches exceptions from the drop handler and surfaces them as a status message.
- **No `throw` statements.** Functions return early with `return;` when validation fails (e.g., `addChow`, `addPung`, `addOpenKong`, `addConcealedKong`).
- **No middleware or global error boundary.** As a vanilla JS app loaded directly into an HTML page, there is no request pipeline to intercept.
- **Validation failures are communicated to the user** via two mechanisms:
  - `showStatusMessage(message, type)` — renders a styled banner in the UI (used for most input validation).
  - Native `alert()` — used sparingly for hard constraints like exceeding tile limits (lines 1181, 1203).

### Key Files and Where Errors Appear

- **`mj.js`** — All user interaction and validation live here:
  - Drag-and-drop drop handlers wrap calls in `try/catch` and call `showStatusMessage('放置失敗', 'error')` on failure (line 364–369).
  - Missing DOM elements log `console.error('... element not found')` during initialization (lines 134, 140, 147).
  - Touch/drag event handlers emit `console.warn(...)` for non-critical issues like missing data attributes or cancelable events (lines 184, 194–201, 237, 244, 290, 321–339, 352).
  - Input validation functions (`addChow`, `addPung`, `addOpenKong`, `addConcealedKong`) check preconditions and call `showStatusMessage('請選擇...', 'error')` then `return` early.
  - `calculateScore()` validates total tile count against the required number and clears results if invalid (lines 1096–1101).
  - `selectTile()` enforces per-tile and total tile limits using `alert()` (lines 1180–1205).
- **`checkHandType.js`** — Pure computation module with no error handling of its own; it reads from the shared `state` object and returns detected hand types. It assumes valid state and does not validate inputs.
- **`mjConst.js`** — Data definitions only; no error-related code.

### Architecture and Conventions

1. **Fail-fast at the UI boundary.** Every user action that mutates state validates first and aborts before touching `state`. This keeps the core calculation logic free of error paths.
2. **Silent guards for internal inconsistencies.** When a DOM lookup fails or expected data is missing, the code logs `console.warn` / `console.error` and bails out rather than crashing — treating these as recoverable runtime conditions.
3. **User-visible problems use `showStatusMessage` with a `'error'` type.** This is the standard channel for user-facing validation feedback. The function simply overwrites the `#status-message` element's innerHTML.
4. **Hard invariant violations use `alert()`.** Cases where the user has done something fundamentally impossible (e.g., selecting more than 4 copies of a tile) use native `alert()` instead of the status banner.
5. **The scoring engine (`checkHandType.js`) is treated as pure.** It receives the application `state` and produces results; it does not throw, log, or otherwise signal errors. Any invalid state will produce incorrect results silently.

### Conventions and Constraints Observed

- User input validation happens in the event handlers, not in shared utility functions.
- Business-rule violations are reported via `showStatusMessage(..., 'error')`; they do not throw exceptions.
- Internal/runtime anomalies (missing DOM nodes, unexpected touch behavior) are logged to `console.warn` / `console.error` and execution continues gracefully.
- There is no centralized error reporting, logging framework, or error aggregation — each handler decides locally how to surface or suppress issues.
- The drag-and-drop subsystem is the only place that wraps operation calls in `try/catch`, indicating that external browser APIs are considered the primary source of unexpected exceptions.