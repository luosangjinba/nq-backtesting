# V6 Session - Step 125 Workstation Chart Slice Selection

Date: 2026-07-07

## Outcome

Step 125 selected Right Rail Session Settings Panel Reservation as the next
bounded workstation/chart implementation slice.

Completed in commit:

- `90eaabc1 docs(v6): select session settings panel slice`

## Selection

Step 126 should reserve an inert right-rail Session settings panel. The panel
should remain distinct from Chart Settings and expose placeholder groups for
Session Info, Balance & Assets, Spreads & Commissions, and Date Range.

## Boundaries

- Keep the existing right-rail Session settings entry as the panel entry point.
- Do not dispatch session-settings, orders, calendar, chart, replay, bar-data,
  default-wall, display-timeframe, or viewport commands from the panel.
- Do not import settings, orders, calendar, chart-engine, chart-data,
  chart-viewport, replay, bar-data, default-wall, or account/analytics owner
  modules into a session-settings panel controller.
- Do not persist session settings before an owner contract exists.
- Keep dashboard row-action visibility unchanged and do not expose Order or
  Calendar.

## Verification

- `node v6/tests/workstation-chart-slice-selection-step125-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-rail-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next Step

Step 126 should implement the inert right-rail Session settings panel
reservation with browser coverage and no runtime ownership.
