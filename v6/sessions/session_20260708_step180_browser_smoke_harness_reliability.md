# V6 Session - Step 180 Browser Smoke Harness Reliability

Date: 2026-07-08

## Completed

Step 180 removed the default fixed Chrome debug port collision from V6 browser
smokes.

Commits:

- `225411dd test(v6): isolate browser smoke debug ports`
- `f86e01a9 test(v6): cover parallel browser harness cleanup`

## Changes

- `openV6Page` now allocates a free Chrome debug port by default.
- Generated Chrome profile paths include process id and debug port.
- Existing env overrides remain available.
- Added parallel harness regression coverage.
- Confirmed the two previously hanging multi-pane browser smokes can now run
  concurrently.

## Verification

- `node v6/tests/browser-harness-parallel-step180-smoke.js`
- `node v6/tests/pane-reload-pipeline-browser-step179-smoke.js`
- `node v6/tests/layout-pane-data-bootstrap-browser-step162-smoke.js`
- `node v6/tests/multi-pane-replay-append-browser-step156-smoke.js`
- `node v6/tests/multi-pane-replay-viewport-projection-browser-step157-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 181 should return to chart-facing work, with browser-heavy tests no longer
blocked by shared CDP port collisions.
