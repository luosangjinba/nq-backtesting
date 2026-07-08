# V6 Chart Browser Regression Pack - Step 181

Date: 2026-07-08

## Boundary

Step 181 adds a selected browser regression pack for chart-facing V6 gates.

No production chart, replay, bar-data, chart-data, chart-viewport, layout, pane,
or workflow ownership behavior changed.

## Pack

New command:

- `node v6/tests/chart-browser-regression-pack.js`

The pack runs:

- `pane-reload-pipeline-browser-step179-smoke.js`
- `layout-pane-data-bootstrap-browser-step162-smoke.js`
- `multi-pane-replay-append-browser-step156-smoke.js`
- `multi-pane-replay-viewport-projection-browser-step157-smoke.js`
- `pane-local-reset-controls-browser-step163-smoke.js`

The runner executes each smoke as a child Node process, prints start/pass/fail
lines with duration, stops at the first failure, and exits with the failing
process code.

## Purpose

The pack gives future chart work one stable command for the currently critical
browser gates:

- pane reload pipeline;
- newly visible pane data bootstrap;
- multi-pane replay append;
- multi-pane replay viewport projection;
- pane-local reset view controls.

It relies on the Step 180 browser harness fix, so the selected smokes can use
their own local server, Chrome debug port, and profile directory without CDP
port collisions.

## Verification

- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 182 should return to chart feature work. The strongest next candidates are
crosshair/OHLC completion or a browser latency gate for leftward historical
extension under replay.
