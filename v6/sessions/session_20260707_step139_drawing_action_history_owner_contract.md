# V6 Session - Step 139 Drawing/Action-History Owner Contract

Date: 2026-07-07

## Outcome

Step 139 established the Drawing/Action-History Owner Contract.

Completed in commit:

- `4c2c992d feat(v6): add drawing action history owner contract`

## Implementation

- Added `v6/src/drawing-action-history/drawing-action-history-contract.js`.
- Added `v6/tests/drawing-action-history-contract-smoke.js`.
- Extended `v6/tests/boundary-smoke.js` to cover the
  `drawing-action-history` source root.
- Documented the accepted contract in
  `v6/docs/V6_DRAWING_ACTION_HISTORY_OWNER_CONTRACT.md`.

## Boundaries

- The left drawing rail remains disabled and inert.
- The top-toolbar undo/redo controls remain disabled and inert.
- Only fixed built-in drawing tool ids are allowed: `cursor`, `trend-line`,
  `horizontal-line`, `rectangle`, `measure`, and `text`.
- No drawing creation, chart overlays, pane mutation, undo/redo execution,
  browser storage, persistence, or runtime command wiring was added.
- No chart, replay, bar-data, default-wall, display-timeframe, viewport,
  session-settings, screenshot/export, indicators, drawing/action-history,
  orders, or calendar commands are dispatched by the contract.
- Dashboard visible row actions remain Summary, Stats, Copy, and Journal.

## Verification

- `node v6/tests/drawing-action-history-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step138-smoke.js`
- `node v6/tests/indicators-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step136-smoke.js`
- `node v6/tests/screenshot-export-contract-smoke.js`
- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/left-drawing-rail-browser-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `git diff --check`

## Next Step

Step 140 should select the next bounded workstation/chart slice after the
drawing/action-history owner contract.
