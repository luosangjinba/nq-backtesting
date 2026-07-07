# V6 Session - Step 123 Bottom Account/Trading Chrome Reservation

Date: 2026-07-07

## Outcome

Step 123 reserved an inert shell-owned bottom account/trading chrome strip for
the workstation surface.

Completed in commit:

- `3ef40a84 feat(v6): reserve bottom account chrome`

## Implementation

- Added `data-v6-bottom-account-chrome` below the chart work area.
- Added disabled Buy, Sell, quantity, and analytics placeholders.
- Added placeholder account balance, realized PnL, and unrealized PnL readouts.
- Kept the floating replay transport separate and moved it above the new bottom
  chrome.
- Added browser coverage for inert state, non-overlap, chart host visibility,
  and dashboard row-action visibility.

## Boundaries

- No orders, chart, replay, bar-data, default-wall, display-timeframe, or
  viewport commands are dispatched from bottom chrome.
- No bottom-chrome controller or runtime owner import was added.
- Buy, Sell, quantity, account balance, PnL, and analytics remain unavailable
  until owner contracts exist.
- Order and Calendar remain hidden from dashboard row actions.

## Verification

- `node v6/tests/bottom-account-chrome-browser-smoke.js`
- `node v6/tests/workstation-rail-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next Step

Step 124 should audit the lower workstation chrome after adding bottom
account/trading chrome.
