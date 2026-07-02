# Step 448 - V5 Replay Transport CSS Module Split

Status: completed.

Date: 2026-07-02

## Goal

Continue CSS modularization by moving replay transport and floating controls
styles out of `app.css`.

## Plan

1. Define replay transport CSS ownership around floating controls, replay
   buttons, drag handle, speed slider, interval, sync, and display-timeframe
   controls.
2. Add a focused replay transport stylesheet.
3. Keep `src/styles/app.css` as the single stylesheet entrypoint loaded by
   `index.html`.
4. Split mixed selector groups so unrelated toolbar controls stay with their
   current owner.
5. Update TODO/session handoff documentation and run targeted smokes, full
   smoke suite, and `git diff --check`.

## Implementation

- Added `src/styles/replay-transport.css`.
- Moved floating replay controls, replay buttons, drag handle, playback speed,
  replay interval, sync control, display-timeframe controls, and transport
  disabled/hover/pressed states out of `src/styles/app.css`.
- Added `@import "./replay-transport.css";` to `src/styles/app.css`.
- Split mixed selector groups so display timezone, presentation, and chart
  navigation styling remains in `app.css`.
- Reduced `app.css` from 885 lines to 749 lines.

## Boundary Notes

- `app.css` remains the CSS entrypoint.
- `replay-transport.css` owns replay transport and floating controls styling
  only.
- Display-timeframe controls are considered part of the transport surface
  because they are rendered inside the compact replay transport.
- This step changes stylesheet organization only; JavaScript behavior, DOM
  classes, commands, and runtime ownership are unchanged.

## Verification

- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/replay-display-timeframe-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/chart-responsive-visual-browser-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next Step Candidate

Step 449 can continue CSS modularization with another complete route surface,
such as chart navigation popovers or replay status/footer, or pause CSS
splitting if a stronger product/runtime boundary becomes more urgent.
