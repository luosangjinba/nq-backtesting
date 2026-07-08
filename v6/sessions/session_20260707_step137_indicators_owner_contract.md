# V6 Session - Step 137 Indicators Owner Contract

Date: 2026-07-07

## Outcome

Step 137 established the Indicators Owner Contract.

Completed in commit:

- `de6e1b54 feat(v6): add indicators owner contract`

## Implementation

- Added `v6/src/indicators/indicators-contract.js`.
- Added `v6/tests/indicators-contract-smoke.js`.
- Extended `v6/tests/boundary-smoke.js` to cover the `indicators` source root.
- Documented the accepted contract in `v6/docs/V6_INDICATORS_OWNER_CONTRACT.md`.

## Boundaries

- The top-toolbar Indicators button remains disabled and inert.
- Only fixed built-in indicator ids are allowed: `sma`, `ema`, `rsi`, `macd`,
  `volume`, `vwap`, and `atr`.
- Pine Script and custom indicator execution are not supported.
- No indicator calculation was added.
- No chart series writes, pane creation, browser storage, persistence, or
  runtime command wiring were added.
- No chart, replay, bar-data, default-wall, display-timeframe, viewport,
  session-settings, screenshot/export, indicators, orders, or calendar commands
  are dispatched by the contract.
- Undo/redo and drawing/action-history behavior remain deferred.
- Dashboard visible row actions remain Summary, Stats, Copy, and Journal.

## Verification

- `node v6/tests/indicators-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step136-smoke.js`
- `node v6/tests/screenshot-export-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step134-smoke.js`
- `node v6/tests/session-settings-contract-smoke.js`
- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next Step

Step 138 should select the next bounded workstation/chart slice after the
indicators owner contract.
