# Step 434 - Workspace Regression Matrix

Date: 2026-07-14

## Outcome

The automated workspace-cleanup regression gate passes. No production runtime
or UI baseline was changed in this step.

## Results

- Chart foundation, panes, layout, timeframe, dragging, and history loading:
  chart browser pack `28/28`.
- Timeframe and Replay foundation: `8/8`; nested Replay-gap fast pack `3/3`.
- Replay Transport modularization: `5/5`.
- Go-to: UI, timeframe matrix, and fixed-timeframe alignment passed.
- Settings: panel, persistence, Canvas, chart view, New York day separators,
  Symbol, Status, and current-price behavior passed `8/8`.
- Session and Journal: dashboard, quick flow, summary, analytics, copy, Journal
  row action, metadata persistence/delete, and session price-scale switching
  passed `9/9`.
- Compact Replay status layout, App Shell, and product baseline screenshot
  passed.
- Boundary smoke passed; static architecture audit passed `124/124`.
- `git diff --check` passed.

The metadata persistence test had one grouped reload timeout. It immediately
passed in isolation and passed again when included with the remaining browser
matrix, so it is recorded as harness timing noise rather than a product
failure.

## Harness Correction

`session-aware-leftward-auto-chain-browser-smoke.js` still coupled success to
an increase in the history runtime's recent-request count. The current shared
projection path can materialize earlier bars without adding such a request.
The test now checks the externally meaningful contract: requested timeframe
applied, oldest visible data moved earlier, bars remain valid, and the viewport
is usable.

## Screenshot Review

`/tmp/v6-product-baseline-shell.png` shows reclaimed top, left, and bottom
space; the right rail contains only the functional Go-to entry. Replay status
is reduced to `Replay ready` and `Future data hidden`, remains clear of the
floating Transport, and no retired placeholder is visible.

## Next

Step 435 is a human visual acceptance pass across single-, two-, and
three-pane layouts and supported desktop resolutions. That step closes the
workspace-cleanup phases; it must not choose the future Semantic Drawing entry
surface or begin the three-mode product architecture.
