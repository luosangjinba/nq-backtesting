# V6 Pane Reload Pipeline End-to-End Coverage - Step 179

Date: 2026-07-08

## Boundary

Step 179 accepts end-to-end coverage for the pane Symbol/Interval reload
pipeline.

The pipeline remains split across existing owners:

- pane runtime owns Symbol/Interval intent state;
- pane-intent reload runtime emits reload intents;
- reload window runtime reads replay state and plans no-future windows;
- reload data runtime asks bar-data to load planned windows;
- reload chart-data runtime replaces pane-local chart-data;
- reload viewport runtime projects the replacement through chart-viewport;
- chart-data and chart-viewport surface bridges update visible chart hosts.

## Coverage

New runtime smoke:

- starts real pane, replay, bar-data, chart-data, chart-viewport, and reload
  runtimes;
- triggers a direct Symbol reload on `main`;
- triggers a direct Interval reload on `secondary`;
- verifies bar-data requests are capped at the replay cursor;
- verifies chart-data filters future bars;
- verifies only the target pane is replaced;
- verifies pane-local viewport projection.

New browser smoke:

- creates two real chart hosts in a browser page;
- connects chart-data and chart-viewport surface bridges;
- runs the same reload pipeline through runtime commands;
- verifies both panes receive visible chart-data and viewport projection.

## Ownership

No production ownership changed in this step.

The tests prove the existing runtimes compose without route-level reload
orchestration, direct chart-engine writes from feature runtimes, bar requests
outside bar-data, chart-data writes outside chart-data, or replay cursor
mutation outside replay runtime.

## Browser Harness Note

The V6 browser harness uses a fixed Chrome debugging port unless overridden by
environment. Browser smokes that use the harness should be run sequentially, or
with isolated `CHROME_DEBUG_PORT` values, to avoid CDP port collisions.

## Verification

- `node v6/tests/pane-reload-pipeline-step179-smoke.js`
- `node v6/tests/pane-reload-pipeline-browser-step179-smoke.js`
- `node v6/tests/layout-pane-data-bootstrap-browser-step162-smoke.js`
- `node v6/tests/pane-intent-reload-viewport-runtime-step178-smoke.js`
- `node v6/tests/pane-intent-reload-chart-data-runtime-step177-smoke.js`
- `node v6/tests/pane-intent-reload-data-runtime-step176-smoke.js`
- `node v6/tests/pane-intent-reload-window-runtime-step175-smoke.js`
- `node v6/tests/pane-intent-reload-runtime-step173-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 180 should address browser smoke reliability directly: make the harness
avoid fixed CDP port collisions or provide a documented serial browser-test
runner before adding more browser-heavy chart gates.
