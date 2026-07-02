# Step 450 - V5 Replay Truncate CSS Module Split

Status: completed.

Date: 2026-07-02

## Goal

Continue CSS modularization by moving replay truncate pick mode and error
popover styles out of `app.css`.

## Plan

1. Define replay truncate CSS ownership around the pick guide line, truncate
   error popover, panel, header/actions, copy, buttons, and hidden states.
2. Add a focused replay truncate stylesheet.
3. Keep `src/styles/app.css` as the single stylesheet entrypoint loaded by
   `index.html`.
4. Move all `.replay-truncate-*` selectors out of `app.css`.
5. Update TODO/session handoff documentation and run targeted smokes, full
   smoke suite, and `git diff --check`.

## Implementation

- Added `src/styles/replay-truncate.css`.
- Moved truncate pick guide line, truncate error popover, truncate panel,
  header/actions, copy, buttons, and hidden states out of `src/styles/app.css`.
- Added `@import "./replay-truncate.css";` to `src/styles/app.css`.
- Reduced `app.css` from 706 lines to 616 lines.

## Boundary Notes

- `app.css` remains the CSS entrypoint.
- `replay-truncate.css` owns replay truncate styling only.
- Chart navigation and Go to styling remain owned by `chart-navigation.css`.
- This step changes stylesheet organization only; JavaScript behavior, DOM
  classes, commands, and runtime ownership are unchanged.

## Verification

- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/chart-go-to-time-browser-smoke.js`
- `node v5/tests/chart-responsive-visual-browser-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next Step Candidate

Step 451 can continue CSS modularization with replay status/footer or chart
overlays, or pause CSS splitting if a stronger product/runtime boundary becomes
more urgent.
