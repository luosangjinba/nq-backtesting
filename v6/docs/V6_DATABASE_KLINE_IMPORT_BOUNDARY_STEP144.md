# V6 Database K-Line Import Boundary - Step 144

Date: 2026-07-07

## Outcome

Step 144 establishes the V6 database K-line import boundary without changing
chart rendering, replay cursor behavior, viewport intent, workstation chrome,
or multi-pane UI.

The implemented boundary is:

- `v6/src/bar-data/database-bars-adapter.js` defines the database bars adapter
  seam;
- `DATABASE_BAR_SCHEMA` records the discovered V4 DuckDB source:
  `v4/data/trading_data.duckdb`, table `futures_1m`, timestamp column `ts`,
  instrument column `instrument`, and OHLCV columns;
- the adapter accepts an injected `queryBars` function, so Step 144 does not
  add a Node DuckDB dependency or move database ownership into chart/replay/UI;
- the adapter maps database rows into the existing bar normalizer shape and
  returns the same bounded bar-window response shape used by `bar-data`;
- `bar-data` cache records preserve adapter `history` metadata for
  exhausted-history and canvas-left request caps.

## Historical Extension Boundary

Leftward history extension is modeled as a bounded older-window request.

Rules:

- chart/viewport interaction may produce demand, but only `bar-data` may
  request and cache bars;
- the older-window helper starts at the canvas-left timeline boundary that
  triggered the load;
- the request ends at the bar immediately before the oldest loaded bar;
- the request must not prefetch farther left than the canvas-left boundary;
- requests that exceed `maxBarsPerWindow` fail instead of becoming hidden full
  history loads;
- the adapter response carries `history.exhaustedBefore` so later chart flow can
  stop extending left when no older bars remain.

## Replay Latency Boundary

Step 144 keeps replay-visible speed as a data-path requirement:

- database query timing is reported separately as `timing.queryMs`;
- adapter mapping/normalization overhead is reported separately as
  `timing.normalizeMs`;
- Step 144 does not excuse delayed candle visibility when the target replay bar
  is already cached;
- future replay chart flow must keep cache-hit visible candle latency covered by
  browser-visible smoke tests.

## What Did Not Change

- no chart series writes were added;
- no chart overlays, Lightweight Charts plugins, custom series, or primitives
  were added;
- no replay cursor mutation was moved into bar-data;
- no viewport intent mutation was moved into bar-data;
- no simulated trading or comparison-symbol behavior was enabled;
- no full session/date-range load was added to session creation or chart entry.

## Verification

- `node v6/tests/database-bars-adapter-smoke.js`
- `node v6/tests/database-kline-import-boundary-step144-smoke.js`
- `node v6/tests/bar-data-domain-smoke.js`
- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/bar-data-adapter-smoke.js`
- `node v6/tests/chart-entry-context-plan-smoke.js`
- `node v6/tests/chart-entry-context-runtime-smoke.js`
- `node v6/tests/chart-entry-initialization-runtime-smoke.js`
- `node v6/tests/chart-foundation-reprioritization-step143-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next Step

Step 145 should begin the replay K-line chart flow on top of this boundary:

- use bounded database/bar-data windows as the source;
- keep initial chart entry limited to prefix plus start bar;
- prove replay K-line visible behavior in the browser;
- preserve canvas-left historical extension semantics;
- keep reset view through chart-viewport ownership;
- do not add multi-pane UI until single-pane replay K-line flow is stable.
