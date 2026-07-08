# V6 Session - Step 140 Workstation Chart Slice Selection

Date: 2026-07-07

## Outcome

Step 140 selected Account/Trading Owner Contract as the next bounded
workstation/chart slice.

Completed in commit:

- `8f958eba docs(v6): select account trading contract slice`

## Decision

Step 141 should establish an account/trading owner contract before the bottom
account/trading chrome becomes interactive.

The selected slice is intentionally bounded:

- define a focused account/trading contract/domain module;
- define explicit account readout fields and trade draft fields;
- define default read-only account/trading intent state and validation helpers;
- keep Buy, Sell, quantity, Analytics, balance, and PnL controls/readouts inert;
- keep this boundary distinct from the existing `orders-runtime` dashboard
  row-action contract;
- do not place orders, mutate positions, mutate account balances, calculate
  analytics, create chart overlays, mutate replay/viewport/chart state, persist
  values, use browser storage, or add runtime command wiring.

## Boundaries

- Dashboard visible row actions remain Summary, Stats, Copy, and Journal.
- Order and Calendar remain hidden.
- Existing owner contracts for session-settings, screenshot/export, indicators,
  and drawing/action-history remain disabled/inert from the shell.
- Bottom account/trading chrome remains shell-reserved and disabled.

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
- `git diff --check`

## Next Step

Step 141 should implement the Account/Trading Owner Contract.
