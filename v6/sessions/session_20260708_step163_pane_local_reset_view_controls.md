# V6 Session - Step 163 Pane-Local Reset View Controls

Date: 2026-07-08

## Completed

Step 163 moved reset view / KXG reset behavior from one chart-surface-global
button to pane-local controls.

Commits:

- `1ab1ddb5 feat(v6): add pane-local reset controls`
- `a11890e6 test(v6): cover pane-local reset browser flow`

## Changes

- Rendered one reset button inside each chart host.
- Wired one reset bridge per pane-local button in `app.js`.
- Exposed bridge `paneId` for compatibility and targeted reset calls.
- Added unit smoke coverage for pane-local reset dispatch payloads.
- Added browser smoke coverage proving secondary reset does not reset main.

## Verification

- `node v6/tests/pane-local-reset-controls-step163-smoke.js`
- `node v6/tests/pane-local-reset-controls-browser-step163-smoke.js`
- `node v6/tests/reset-view-control-bridge-smoke.js`
- `node v6/tests/reset-view-kxg-flow-browser-step146-smoke.js`
- `node v6/tests/layout-pane-data-bootstrap-browser-step162-smoke.js`
- `node v6/tests/layout-pane-surface-reflow-browser-step161-smoke.js`
- `node v6/tests/layout-pane-bootstrap-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 164 should implement layout variant geometry before pane resize dragging.
