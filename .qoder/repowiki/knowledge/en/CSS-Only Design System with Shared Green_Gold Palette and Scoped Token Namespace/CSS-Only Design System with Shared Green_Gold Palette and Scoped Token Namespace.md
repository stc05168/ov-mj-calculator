---
kind: frontend_style
name: CSS-Only Design System with Shared Green/Gold Palette and Scoped Token Namespaces
category: frontend_style
scope:
    - '**'
source_files:
    - ov-mj-calculator/mahjong-suite/styles.css
    - ov-mj-calculator/session-scorekeeper/styles.css
    - ov-mj-calculator/session-scorekeeper-online/styles.css
    - ov-mj-calculator/mj.css
---

## What system/approach is used

The frontend styling is a **pure CSS, no-framework approach** spread across several sibling single-page apps. There is no build step, preprocessors, or component library — each app ships its own `styles.css` (and one legacy `mj.css`) linked directly from an HTML file. The codebase does use modern CSS features: CSS custom properties (`:root` variables), `clamp()` for fluid typography, `env(safe-area-inset-*)` for notched devices, `100dvh`, `color-mix()`, `@media (prefers-reduced-motion)`, and CSS Grid/Flexbox layouts.

## Key files and packages

- `ov-mj-calculator/mahjong-suite/styles.css` — the suite shell that embeds the calculator and scorekeeper in iframes; defines the shared design tokens and chrome.
- `ov-mj-calculator/session-scorekeeper/styles.css` — the standalone session scorekeeper UI; defines its own scoped token namespace (`--tms-*`).
- `ov-mj-calculator/session-scorekeeper-online/styles.css` — the account/cloud-sync shell around the scorekeeper iframe; reuses the same green/gold palette without importing it.
- `ov-mj-calculator/mj.css` — legacy stylesheet for the hand-type calculator embedded inside the suite; uses plain class names and inline color literals rather than tokens.
- Root-level `mj.css` / `mj.html` / `mj.js` — older standalone calculator entry points that predate the `ov-mj-calculator/` layout.

## Architecture and conventions

### Design tokens via CSS custom properties

Two parallel token namespaces coexist:

| Namespace | Scope | Example tokens |
|---|---|---|
| Suite tokens (no prefix) | `mahjong-suite/styles.css` | `--green-950`, `--gold`, `--paper`, `--bg`, `--line`, `--ink`, `--muted` |
| Scorekeeper tokens (`--tms-*`) | `session-scorekeeper/styles.css` | `--tms-bg`, `--tms-surface`, `--tms-green-950`, `--tms-gold`, `--tms-radius-lg`, `--tms-shadow`, `--tms-safe-bottom` |

Both namespaces share the same semantic palette: dark green (`#0b2b26` / `#123c35` / `#236b5e`), warm gold (`#d7a83f`), paper white (`#fffdf7`), muted gray (`#64706c`), and red accents (`#b9463f`). The online shell (`session-scorekeeper-online/styles.css`) hard-copies these literal colors instead of sharing tokens, which is a deviation from the pattern.

### Naming convention

- Suite shell uses BEM-like class names prefixed with `.suite-` (`.suite-header`, `.suite-nav`, `.suite-panel`, `.transfer-tray`, `.suite-toast`).
- Session scorekeeper uses a `tms-` prefix (`.tms-body`, `.tms-card`, `.tms-button`, `.tms-player-score`, `.tms-tab-bar`, etc.) to isolate styles when the scorekeeper runs inside an iframe.
- Legacy calculator uses flat class names (`.tile`, `.section`, `.controls`, `.score-display`).

### Layout model

- All three apps are **mobile-first responsive** using CSS Grid and Flexbox with `minmax(0, 1fr)` columns to prevent overflow in nested iframes.
- A consistent header gradient background transitions from deep green to light paper at a fixed pixel stop (e.g., `linear-gradient(180deg, var(--green-950) 0 250px, var(--bg) 250px)`).
- Cards use rounded corners (`border-radius: 16px–24px`), subtle borders, and soft shadows (`--tms-shadow`, `box-shadow: 0 16px 40px rgba(18, 60, 53, 0.09)`).
- The suite shell uses a sticky bottom `transfer-tray` panel to move calculated fan values into the scorekeeper iframe; the scorekeeper itself has a fixed bottom tab bar (`.tms-tab-bar`).

### Responsive strategy

Breakpoints are applied per-app rather than through a shared breakpoint map:
- `mahjong-suite`: `760px`, `390px`, `360px`.
- `session-scorekeeper`: `760px`, `390px`, `360px` (inherited from suite patterns).
- `session-scorekeeper-online`: `980px`, `620px`, `390px`, `360px`.
- `mj.css` (legacy): `480px`.

All apps use `clamp()` for fluid headings, `env(safe-area-inset-*)` for iPhone notch padding, and `100dvh` for correct mobile viewport height.

### Embedded-mode overrides

Both the suite and the legacy calculator detect when they are loaded inside another iframe by checking `html[data-embedded="true"]` and hide chrome (header, panel head) while adjusting heights. This allows the suite to embed the calculator and scorekeeper as self-contained documents.

### Accessibility & interaction

- Focus outlines use a 3px gold outline (`outline: 3px solid #79b8aa` / `var(--tms-gold)`).
- Skip link (`.tms-skip-link`) is present in the scorekeeper.
- Touch targets are sized to ≥44px minimum height on buttons, inputs, and selects.
- `user-select: none`, `-webkit-touch-callout: none`, and `touch-action: manipulation` are applied to tiles and interactive elements to support drag-and-drop tile selection.
- `prefers-reduced-motion` wraps entrance animations (`rise`, `tray`).

## Conventions and constraints observed

1. **No CSS framework or preprocessor** — every style is written in plain CSS files linked directly from HTML.
2. **Each app owns its stylesheet** — there is no shared CSS file imported between apps; the suite shell only shares visual intent through duplicated token values.
3. **Token scoping via prefixes** — the scorekeeper isolates its styles under `--tms-*` so it can be safely embedded in the suite's iframe without leaking selectors.
4. **Consistent color vocabulary** — all apps converge on the same green/gold/paper/red palette, even when values are copy-pasted as literals.
5. **Mobile-first responsive with `clamp()` + media queries** — fluid typography paired with explicit breakpoints at ~620–760px ranges.
6. **Embedded-iframe awareness** — apps guard their chrome behind `html[data-embedded="true"]` so the suite can compose them.
7. **Touch-friendly interaction surface** — minimum 44px tap targets, drag-and-drop tile handling, and `touch-action: manipulation` throughout.
8. **Accessibility baseline** — visible focus rings, skip links, reduced-motion respect, and `color-scheme: light` declarations.