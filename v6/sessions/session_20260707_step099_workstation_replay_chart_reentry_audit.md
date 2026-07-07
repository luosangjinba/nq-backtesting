# V6 Session - Step 99 Workstation Replay/Chart Re-entry Audit

Date: 2026-07-07

## Summary

Step 99 re-audited the workstation replay/chart path after dashboard readiness
closeout.

No new owner violation was found:

- `bar-data` owns V4/API bar window requests and cache records;
- `replay` owns replay cursor and playback state;
- `chart-entry` coordinates session activation, replay bootstrap, data windows,
  chart-data appends, and viewport projection commands;
- `chart-data` owns pane bar records and emits `chartData:barsChanged`;
- `chart-viewport` owns viewport intent/projection records and emits
  `chartViewport:projected`;
- `chart-engine` browser surface owns Lightweight Charts adapter calls, series
  data writes, and visible logical range application;
- dashboard row actions remain outside the workstation replay/chart path.

## External References

Checked current references before selecting the next workstation slice:

- Lightweight Charts 5.2 `ISeriesApi`
- Lightweight Charts 5.2 `ITimeScaleApi`
- TradingView `awesome-tradingview`

## Boundary Notes

- The chart-data and chart-viewport bridges stay event-only.
- Workstation browser smokes now use the current shell pane id, `main`.
- The next implementation slice should explicitly define the browser chart
  surface owner contract.

## Commits

- `b2cbcb1f docs(v6): audit workstation replay chart reentry`
- `c34ace79 test(v6): align workstation browser smokes with main pane`

## Verification

- `node v6/tests/workstation-replay-chart-reentry-audit-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/session-dashboard-readiness-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/workstation-chart-adapter-browser-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`
- `git diff --check`

## Next

Step 100 should be Workstation Chart Surface Owner Contract: add a focused
contract module and smoke for the browser chart surface boundary without
changing dashboard row action visibility.
