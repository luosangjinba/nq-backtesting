# V6 Reload Replacement Viewport Projection - Step 178

Date: 2026-07-08

## Boundary

Step 178 adds the viewport projection boundary after reload chart-data
replacement.

The runtime listens to `paneIntentReloadChartData:replaced`, ensures a
pane-local chart-viewport intent through the chart-viewport owner, and applies
the replacement chart-data revision through the chart-viewport owner.

## Ownership

- `pane-intent-reload-chart-data-runtime` owns chart-data replacement only.
- `pane-intent-reload-viewport-runtime` owns the handoff from replacement
  records to chart-viewport projection.
- Chart-viewport runtime remains the only owner that creates viewport intents
  and projections.
- Chart engine is not touched directly in this step.
- Replay state is not mutated.

## Contract

New contract surface:

- `paneIntentReloadViewport.getState`
- `paneIntentReloadViewport:projected`

The projected event payload includes pane id, chart-data revision, latest
logical index, cursor timestamp, original reload window, and the chart-viewport
projection record returned by the chart-viewport owner.

## Non-Goals

This step does not:

- call chart-data commands;
- call bar-data commands;
- write chart series directly;
- add UI behavior for Symbol/Interval controls;
- add browser end-to-end coverage for the full reload pipeline.

## Verification

- `node v6/tests/pane-intent-reload-viewport-runtime-step178-smoke.js`
- `node v6/tests/pane-intent-reload-chart-data-runtime-step177-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 179 should verify the full Symbol/Interval reload pipeline end to end:
reload-intent, replay-safe planning, bar-data load, chart-data replacement, and
viewport projection. Browser coverage should confirm the visible chart updates
without direct chart-engine writes from feature runtimes.
