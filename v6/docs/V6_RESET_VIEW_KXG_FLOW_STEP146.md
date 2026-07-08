# V6 Reset View / KXG Reset Flow - Step 146

Date: 2026-07-08

## Outcome

Step 146 gates reset view / KXG reset behavior on top of the Step 145 replay
K-line chart flow.

The implemented gates prove:

- reset after initial replay K-line load returns the pane to the default replay
  wall;
- reset after replay `Next` returns the pane to the default replay wall using
  the updated latest K-line;
- reset remains a chart-viewport intent/projection operation;
- reset does not request bars, mutate bar-data cache, mutate replay cursor, or
  write chart series;
- browser reset uses the mounted Reset control and keeps the latest K-line
  visible after initial load and after `Next`.

## Ownership

- Chart-viewport owns reset intent and logical-range projection.
- Chart-engine applies the resulting visible logical range to Lightweight
  Charts.
- Chart-data remains the owner of pane-local bars.
- Bar-data remains the only owner that requests and caches K-lines.
- Replay runtime remains the only owner of replay cursor and reveal state.
- UI remains command/event driven through the reset control bridge.

## What Did Not Change

- no simulated trading behavior was enabled;
- no comparison-symbol behavior was enabled;
- no chart overlays, Lightweight Charts plugins, custom series, or primitives
  were added;
- no multi-pane UI was added;
- no full session/date-range chart preload was added.

## Verification

- `node v6/tests/reset-view-kxg-flow-step146-smoke.js`
- `node v6/tests/reset-view-kxg-flow-browser-step146-smoke.js`
- `node v6/tests/replay-kline-chart-flow-step145-smoke.js`
- `node v6/tests/replay-kline-chart-flow-browser-step145-smoke.js`
- `node v6/tests/database-kline-import-boundary-step144-smoke.js`
- `node v6/tests/chart-foundation-reprioritization-step143-smoke.js`
- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/chart-entry-initialization-runtime-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-runtime-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next Step

Step 147 should start the multi-pane chart foundation through the pane-model
boundary:

- keep pane-local bars in chart-data;
- keep pane-local viewport intent in chart-viewport;
- keep chart-engine as the only chart series writer;
- preserve replay cursor ownership and bounded bar-data windows;
- verify the primary replay pane stays visible and responsive after introducing
  a secondary pane foundation.
