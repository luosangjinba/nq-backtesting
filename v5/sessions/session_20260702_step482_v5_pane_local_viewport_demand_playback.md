# Step 482 - V5 Pane-Local Viewport Demand And Playback

## Goal

Fix the split-pane regression where a right-side pane changed to its own TF can
stop extending left after drag/zoom, and reduce playback stutter caused by
unnecessary multi-pane chart rewrites.

## Result

- Pane-local chart state now includes bars, display context, visible range,
  viewport follow, interaction, prefix demand, and viewport demand.
- Native chart drag/zoom callbacks carry the mounted pane id into chart runtime
  visible-range handling.
- Pane-local viewport demand includes `paneId`, and the replay viewport-demand
  bridge passes it into `replay.loadDisplayWindow`.
- Demand de-duping includes pane id so two panes can request the same
  instrument/timeframe window independently when needed.
- Primary replay bar replacement no longer rewrites mounted panes that already
  have pane-local display state.
- Regression coverage asserts secondary-pane demand stays on `secondary` with
  the secondary TF and that primary replay updates do not call `setData()` on a
  pane-local secondary chart.

## Boundaries

- Chart runtime remains the only chart writer.
- Replay runtime remains the display-window loader and no-future filter.
- Bar-data runtime remains the only bar requester/cache owner.
- Route UI still dispatches commands and does not request bars or write chart
  series directly.

## Verification

- `node --check v5/src/runtime/chart-runtime.js`
- `node --check v5/src/runtime/chart-runtime-viewport.js`
- `node --check v5/src/features/chart-replay/viewport-demand-wiring.js`
- `node --check v5/tests/chart-runtime-pane-local-viewport-smoke.js`
- `node v5/tests/chart-runtime-pane-local-viewport-smoke.js`
- `node v5/tests/replay-display-viewport-demand-wiring-smoke.js`
- `node v5/tests/replay-display-timeframe-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`

## Next

Step 483 should be a focused live/browser performance pass for multi-pane
playback and split resize. Capture chart write/resize counts during manual and
auto playback before adding more split-pane behavior.
