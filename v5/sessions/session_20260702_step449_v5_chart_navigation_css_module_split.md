# Step 449 - V5 Chart Navigation CSS Module Split

Status: completed.

Date: 2026-07-02

## Goal

Continue CSS modularization by moving chart navigation controls and Go to
popover styles out of `app.css`.

## Plan

1. Define chart navigation CSS ownership around navigation controls, Go to
   popover, Go to panel, Go to header/actions, navigation inputs, and navigation
   disabled/layout states.
2. Add a focused chart navigation stylesheet.
3. Keep `src/styles/app.css` as the single stylesheet entrypoint loaded by
   `index.html`.
4. Split shared Go to/truncate selector groups so replay truncate styles remain
   independently owned.
5. Update TODO/session handoff documentation and run targeted smokes, full
   smoke suite, and `git diff --check`.

## Implementation

- Added `src/styles/chart-navigation.css`.
- Moved chart navigation controls, Go to popover, Go to panel, Go to
  header/actions, navigation inputs, and navigation disabled/layout states out
  of `src/styles/app.css`.
- Added `@import "./chart-navigation.css";` to `src/styles/app.css`.
- Split shared Go to/truncate selector groups; replay truncate error popover
  styles remain in `app.css`.
- Reduced `app.css` from 749 lines to 706 lines.

## Boundary Notes

- `app.css` remains the CSS entrypoint.
- `chart-navigation.css` owns chart navigation and Go to styling only.
- Replay truncate styles are intentionally left in `app.css` for this step, but
  their selector groups no longer depend on Go to selectors.
- This step changes stylesheet organization only; JavaScript behavior, DOM
  classes, commands, and runtime ownership are unchanged.

## Verification

- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/chart-go-to-time-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/chart-responsive-visual-browser-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next Step Candidate

Step 450 can continue CSS modularization with replay truncate popover or replay
status/footer, or pause CSS splitting if a stronger product/runtime boundary
becomes more urgent.
