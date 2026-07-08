# V6 Session - Step 144 Database K-Line Import Boundary

Date: 2026-07-07

## Outcome

Step 144 established the database K-line import boundary under V6 bar-data
ownership.

Completed in commits:

- `b74fd09e feat(v6): add database bars adapter boundary`
- `3be1804e test(v6): cover database k-line import boundary`

## Implementation

- Added `v6/src/bar-data/database-bars-adapter.js`.
- Recorded the discovered V4 DuckDB source:
  `v4/data/trading_data.duckdb`, table `futures_1m`, timestamp column `ts`,
  instrument column `instrument`, and OHLCV columns.
- Added `planCanvasLeftOlderWindow` for bounded leftward history extension.
- Preserved adapter `history` metadata in bar-data cache records.
- Added smoke coverage for database row mapping, canvas-left request caps,
  exhausted-history metadata, cache preservation, and bounded chart-entry
  planning.

## Boundaries

- Bar-data remains the only owner that requests and caches bars.
- Chart-engine remains the only owner that writes chart series.
- Replay runtime remains the only owner of replay cursor and reveal state.
- Chart-viewport remains the only owner of viewport intent.
- Session creation and chart entry still plan prefix plus start-bar context,
  not full session/date-range loads.
- No chart overlays, Lightweight Charts plugins, custom series, simulated
  trading, comparison symbols, or multi-pane UI were added.

## Verification

- `node v6/tests/database-bars-adapter-smoke.js`
- `node v6/tests/database-kline-import-boundary-step144-smoke.js`
- `node v6/tests/bar-data-domain-smoke.js`
- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/bar-data-adapter-smoke.js`
- `node v6/tests/chart-entry-context-plan-smoke.js`
- `node v6/tests/chart-entry-context-runtime-smoke.js`
- `node v6/tests/chart-entry-initialization-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next Step

Step 145 should begin the replay K-line chart flow on top of the Step 144
database/bar-data boundary.
