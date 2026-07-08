# V6 Browser Smoke Harness Reliability - Step 180

Date: 2026-07-08

## Boundary

Step 180 hardens the V6 browser smoke harness only.

No chart, replay, bar-data, chart-data, chart-viewport, layout, pane, or
workflow ownership behavior changed.

## Change

`openV6Page` now allocates a free Chrome remote debugging port by default.

Environment overrides are preserved:

- `CHROME_DEBUG_PORT` still forces a specific Chrome debugging port.
- `CHROME_PROFILE_DIR` still forces a specific profile directory.
- `V6_WEB_PORT` and `V6_PAGE_URL` still override the served page.

When no profile override is provided, the harness creates a profile path that
includes the process id and selected debug port. Cleanup still closes the CDP
client, terminates Chrome and the local web server, waits for both processes,
and removes the generated profile directory.

## Regression Coverage

New smoke:

- `browser-harness-parallel-step180-smoke.js`

It opens two V6 pages concurrently and verifies:

- each page uses a different debug port;
- each page uses a different profile directory;
- each page uses a different local page URL;
- both pages boot;
- cleanup removes both generated profile directories.

## Verification

- `node v6/tests/browser-harness-parallel-step180-smoke.js`
- `node v6/tests/pane-reload-pipeline-browser-step179-smoke.js`
- `node v6/tests/layout-pane-data-bootstrap-browser-step162-smoke.js`
- `node v6/tests/multi-pane-replay-append-browser-step156-smoke.js`
- `node v6/tests/multi-pane-replay-viewport-projection-browser-step157-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 181 can return to chart feature work with browser smokes safe to run in
parallel, or add a small browser regression pack runner if the workflow needs a
single command for selected chart browser gates.
