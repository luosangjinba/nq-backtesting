# V6 Workstation Chart Slice Selection - Step 140

Date: 2026-07-07

## Decision

The next bounded workstation/chart slice should be Account/Trading Owner
Contract.

The drawing/action-history owner contract is now in place, and the updated
parity gap audit still calls for explicit owners before deferred runtime-owned
workstation controls become interactive. Account/trading is the smallest
remaining bottom-chrome owner family because V6 already has an inert bottom
account/trading strip with disabled Buy, Sell, quantity, analytics, balance,
and PnL placeholders while no account/trading owner exists yet.

This is distinct from the existing `orders-runtime` dashboard row-action
contract. The account/trading owner should define the bottom workstation
control/readout boundary before any trading/account UI is enabled.

## Selected Slice

Step 141 should establish an account/trading owner contract without making the
bottom account/trading chrome interactive.

The slice should:

- define a focused account/trading contract module;
- define explicit account readout fields such as account id, balance,
  available balance, equity, realized PnL, unrealized PnL, margin, currency,
  and metadata;
- define explicit trade draft fields such as side, symbol, quantity, order
  type, price, stop loss, take profit, time in force, session id, and metadata;
- define default read-only account/trading intent state and validation helpers
  for future owner wiring;
- keep Buy, Sell, quantity, and Analytics controls disabled and inert;
- keep account balance and PnL readouts as placeholders unless the contract is
  only returning read-only default intent data;
- avoid order placement, position mutation, account mutation, analytics
  calculation, chart overlays, replay mutation, bar requests, persistence,
  browser storage, or runtime command wiring until an account/trading runtime
  owner is explicitly selected;
- preserve diagnostics visibility cleanup, chart host, left drawing rail,
  right utility rail, right-rail Session settings panel, drawing/action-history
  contract, indicators contract, screenshot/export contract, floating
  transport, footer status bar, and dashboard row-action visibility.

## Ownership Boundary

Allowed:

- a focused `account-trading` contract/domain module;
- pure validation/default-intent helpers;
- contract smoke coverage and static boundary checks;
- docs/test updates that name the future owner boundary.

Forbidden:

- enabling Buy, Sell, quantity, or Analytics controls;
- placing orders, mutating positions, mutating account balances, calculating
  trading analytics, creating chart overlays, or mutating chart state;
- dispatching account/trading, orders, chart, replay, bar-data, default-wall,
  display-timeframe, viewport, session-settings, screenshot/export, indicators,
  drawing/action-history, or calendar commands from bottom chrome;
- importing chart-engine, chart-data, chart-viewport, replay, bar-data,
  default-wall, display-timeframe, indicators, drawing-action-history,
  settings, session-settings, screenshot-export, orders, calendar, account,
  analytics, persistence, V4, vendor, or Lightweight Charts modules into an
  account/trading contract;
- exposing Order or Calendar row actions;
- changing dashboard visible row actions from Summary, Stats, Copy, and
  Journal.

## Acceptance For Step 141

- new account/trading contract smoke passes;
- Step 140 slice selection smoke passes;
- drawing/action-history contract smoke passes;
- Step 138 slice selection smoke passes;
- indicators contract smoke passes;
- screenshot/export contract smoke passes;
- session-settings contract smoke passes;
- diagnostics visibility cleanup browser smoke still passes;
- bottom chrome regression audit browser smoke still passes;
- bottom account chrome browser smoke still passes;
- workstation chart presentation re-audit smoke still passes;
- dashboard row-action visibility remains Summary, Stats, Copy, and Journal;
- boundary smoke passes.

## Verification

- `node v6/tests/workstation-chart-slice-selection-step140-smoke.js`
- `node v6/tests/drawing-action-history-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step138-smoke.js`
- `node v6/tests/indicators-contract-smoke.js`
- `node v6/tests/screenshot-export-contract-smoke.js`
- `node v6/tests/session-settings-contract-smoke.js`
- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/bottom-account-chrome-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
