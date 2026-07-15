# Session 2026-07-09 - Step 242 Manual Previous Transport Button

## Scope

- Wired the replay transport Previous button to the existing chart-entry manual
  Previous command.
- Kept ownership boundaries unchanged.

## Changes

- Added `previous` action resolution in replay transport.
- Enabled `data-v6-transport-step-back` only when replay reports
  `previousAvailable`.
- Removed the transport action when Previous is unavailable.
- Enriched Previous dispatch payload with visible pane ids, matching manual
  Next and auto-play start behavior.
- Added browser coverage for real button click rewind/chart-data/viewport
  behavior.
- Updated Step 241 readiness smoke to reflect the now-enabled button state.

## Verification

- `node v6/tests/manual-previous-transport-button-browser-step242-smoke.js`
- `node v6/tests/manual-previous-transport-readiness-browser-step241-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/manual-previous-viewport-preservation-browser-step240-smoke.js`
- `node v6/tests/manual-previous-browser-wiring-guard-step239-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

- Step 243 should add multi-pane browser coverage for Previous transport
  dispatch so visible panes rewind together through the shell button.
