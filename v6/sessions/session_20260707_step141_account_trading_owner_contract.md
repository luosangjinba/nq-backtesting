# V6 Session - Step 141 Account/Trading Owner Contract

Date: 2026-07-07

## Outcome

Step 141 established the Account/Trading Owner Contract.

Completed in commit:

- `28e78e55 feat(v6): add account trading owner contract`

## Implementation

- Added `v6/src/account-trading/account-trading-contract.js`.
- Added `v6/tests/account-trading-contract-smoke.js`.
- Extended `v6/tests/boundary-smoke.js` to cover the `account-trading` source
  root.
- Documented the accepted contract in
  `v6/docs/V6_ACCOUNT_TRADING_OWNER_CONTRACT.md`.

## Boundaries

- The bottom Buy, Sell, quantity, and Analytics controls remain disabled and
  inert.
- Account balance and PnL readouts remain placeholders in the shell.
- The account/trading owner remains distinct from the existing
  `orders-runtime` dashboard row-action contract.
- No order placement, position mutation, account mutation, analytics
  calculation, chart overlays, replay mutation, bar requests, browser storage,
  persistence, or runtime command wiring was added.
- No chart, replay, bar-data, default-wall, display-timeframe, viewport,
  session-settings, screenshot/export, indicators, drawing/action-history,
  account/trading, orders, or calendar commands are dispatched by the contract.
- Dashboard visible row actions remain Summary, Stats, Copy, and Journal.

## Verification

- `node v6/tests/account-trading-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step140-smoke.js`
- `node v6/tests/drawing-action-history-contract-smoke.js`
- `node v6/tests/indicators-contract-smoke.js`
- `node v6/tests/screenshot-export-contract-smoke.js`
- `node v6/tests/session-settings-contract-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/bottom-account-chrome-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `git diff --check`

## Next Step

Step 142 should select the next bounded workstation/chart slice after the
account/trading owner contract.
