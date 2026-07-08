# V6 Reloaded Data Chart-Data Replacement - Step 177

Date: 2026-07-08

## Boundary

Step 177 adds the chart-data replacement boundary for loaded reload data.

The runtime listens to `paneIntentReloadData:loaded`, reads the already-loaded
bar-data window from the bar-data cache, and calls
`CHART_DATA_COMMANDS.REPLACE_BARS` for the target pane.

## Ownership

- `pane-intent-reload-data-runtime` owns bar-data loading only.
- `pane-intent-reload-chart-data-runtime` owns the handoff from loaded reload
  data to pane-local chart-data replacement.
- Chart-data runtime remains the only owner that mutates pane bar records.
- Bar-data runtime remains the only owner that serves cached window bars.
- Chart-viewport runtime is not called in this step.
- Chart engine is not touched in this step.

## No-Future Rule

The replacement runtime derives `cursorTimestamp` from the replay-capped reload
window end. Chart-data replacement receives that cursor timestamp, so the
chart-data owner applies its existing no-future filtering before storing bars.

## Contract

New contract surface:

- `paneIntentReloadChartData.getState`
- `paneIntentReloadChartData:replaced`

The replaced event payload includes pane metadata, the original reload window,
the cursor timestamp, and the chart-data record returned by the chart-data
owner.

## Non-Goals

This step does not:

- call chart-viewport projection commands;
- reset view or change viewport intent;
- write chart series directly;
- mutate replay cursor or reveal state;
- add UI behavior for Symbol/Interval controls.

## Verification

- `node v6/tests/pane-intent-reload-chart-data-runtime-step177-smoke.js`
- `node v6/tests/pane-intent-reload-data-runtime-step176-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 178 should define reload replacement viewport projection. It should consume
the chart-data replacement event and project the pane viewport through the
chart-viewport owner without introducing chart-engine writes outside existing
surface bridges.
