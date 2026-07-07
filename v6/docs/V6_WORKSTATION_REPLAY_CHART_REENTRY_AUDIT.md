# V6 Workstation Replay/Chart Re-entry Audit

Date: 2026-07-07

## External Reference Check

Checked current Lightweight Charts and TradingView ecosystem references before
selecting the next workstation slice:

- Lightweight Charts 5.2 `ISeriesApi`: `setData` replaces series data and
  `update` appends or updates a single bar.
- Lightweight Charts 5.2 `ITimeScaleApi`: visible logical range is controlled
  through the time scale API.
- TradingView `awesome-tradingview`: no off-the-shelf pattern changes the V6
  ownership rule that a chart adapter/surface should be the only browser owner
  of series writes and visible range application.

References:

- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi
- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ITimeScaleApi
- https://github.com/tradingview/awesome-tradingview

## Decision

The workstation replay/chart path is ready to re-enter after the dashboard
sequence. No dashboard closeout work changed the established workstation
ownership assumptions.

Current accepted path:

- `bar-data` owns V4/API bar window requests and cache records.
- `replay` owns replay cursor and playback state.
- `chart-entry` coordinates session activation, replay bootstrap, data windows,
  chart-data appends, and viewport projection commands.
- `chart-data` owns pane bar records and emits `chartData:barsChanged`.
- `chart-viewport` owns viewport intent/projection records and emits
  `chartViewport:projected`.
- `chart-engine` browser surface owns Lightweight Charts adapter calls,
  including series data writes and visible logical range application.
- Dashboard row actions remain outside this path.

## Boundary Result

No new owner violation was found.

The only source path that should call Lightweight Charts `createChart`,
`series.setData`, `series.update`, or time-scale visible range APIs is the chart
engine adapter layer, with `chart-host-manager` and `workstation-chart-surface`
acting as the browser-facing chart surface boundary.

The chart-data and chart-viewport bridges stay event-only:

- `chart-data-surface-bridge` subscribes to `chartData:barsChanged` and applies
  the record to the chart surface;
- `chart-viewport-surface-bridge` subscribes to `chartViewport:projected` and
  applies the projection to the chart surface;
- neither bridge requests bars, advances replay, computes projections, or
  mutates session/dashboard state.

## Regression Gates

The selected regression gates for this re-entry point are:

- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`
- `node v6/tests/session-dashboard-readiness-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`

## Step 100 Direction

Step 100 should be Workstation Chart Surface Owner Contract.

Scope:

- add an explicit chart surface owner contract for browser adapter ownership;
- define allowed operations: mount chart host, write series data from chart-data
  records, apply visible logical range from chart-viewport projections, measure
  user-driven visible ranges, and expose read-only snapshots for tests;
- define blocked operations: fetching bars, advancing replay, loading sessions,
  computing replay cursor state, owning dashboard row actions, and mutating
  order/journal/calendar state;
- keep `chart-data-surface-bridge` and `chart-viewport-surface-bridge`
  event-only.

Acceptance:

- contract smoke guards the chart surface owner boundary;
- workstation chart data/viewport/default-wall/manual-wall browser smokes pass;
- dashboard row action visibility remains unchanged.
