# V6 Session - Step 122 Workstation Chart Slice Selection

Date: 2026-07-07

## Outcome

Step 122 selected Bottom Account/Trading Chrome Reservation as the next bounded
workstation/chart implementation slice.

Completed in commit:

- `ba95a9a5 docs(v6): select bottom account chrome slice`

## Selection

Step 123 should reserve an inert bottom account/trading chrome strip. The strip
should be a shell-owned surface with disabled placeholders for Buy, Sell,
quantity, account balance, realized PnL, unrealized PnL, and analytics.

## Boundaries

- Keep the existing floating replay transport as a separate shell transport
  surface.
- Do not dispatch orders, chart, replay, bar-data, default-wall,
  display-timeframe, or viewport commands from the bottom chrome strip.
- Do not import orders, chart-engine, chart-data, chart-viewport, replay,
  bar-data, default-wall, or account/analytics owner modules into a
  bottom-chrome controller.
- Do not make Buy, Sell, quantity, account balance, PnL, or analytics
  interactive before owner contracts exist.
- Keep dashboard row-action visibility unchanged and do not expose Order or
  Calendar.

## Verification

- `node v6/tests/workstation-chart-slice-selection-step122-smoke.js`
- `node v6/tests/workstation-rail-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next Step

Step 123 should implement the inert bottom account/trading chrome reservation
with browser coverage and no runtime ownership.
