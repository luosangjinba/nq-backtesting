# V6 Replay K-Line Chart Flow - Step 145

Date: 2026-07-07

## Outcome

Step 145 starts the replay K-line chart flow on top of the Step 144
database/bar-data boundary.

The implemented gate proves:

- chart entry can use a bounded database-backed bar-data window;
- initial replay chart state remains prefix plus start bar, not a full session
  date range;
- replay `Next` reveals the next K-line through replay runtime, bar-data, and
  chart-data ownership boundaries;
- chart-entry projection passes the wall span into chart-viewport ownership so
  viewport projection matches the prepared K-line wall;
- browser-visible K-line checks verify the latest candle is actually visible
  before and after `Next`.

## Ownership

- Bar-data remains the only owner that requests and caches K-lines.
- Chart-data remains the owner of pane-local chart bars.
- Chart-engine remains the only owner that writes chart series.
- Replay runtime remains the only owner of replay cursor and reveal state.
- Chart-viewport remains the only owner of viewport intent and projection.
- UI remains command/event driven.

## Latency

The browser gate measures latest-candle visibility after `Next`. This keeps the
Step 144 latency constraint active: runtime command completion alone is not
accepted as replay chart success.

## What Did Not Change

- no simulated trading behavior was enabled;
- no comparison-symbol behavior was enabled;
- no chart overlays, Lightweight Charts plugins, custom series, or primitives
  were added;
- no multi-pane UI was added;
- no full session/date-range chart preload was added.

## Verification

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

Step 146 should focus on reset view / KXG reset behavior through
chart-viewport ownership:

- keep reset view as a chart-viewport intent operation;
- verify reset after initial replay K-line load;
- verify reset after `Next`;
- preserve database/bar-data bounded windows and replay cursor ownership;
- avoid adding multi-pane UI until reset behavior is stable.
