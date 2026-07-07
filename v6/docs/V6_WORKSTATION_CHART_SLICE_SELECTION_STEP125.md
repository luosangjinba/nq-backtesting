# V6 Workstation Chart Slice Selection - Step 125

Date: 2026-07-07

## Decision

The next bounded workstation/chart slice should be Right Rail Session Settings
Panel Reservation.

This follows the bottom chrome regression audit and the FXReplay UI parity
priority order. V6 already has a disabled right-rail Session settings button,
but it does not yet reserve the distinct Session settings panel shell called
out by the parity gap audit. The next slice can reserve that shell surface
without adding session-settings behavior, account behavior, orders, calendar,
chart ownership, replay ownership, or persistence.

## Selected Slice

Step 126 should reserve an inert right-rail Session settings panel.

The slice should:

- keep Chart Settings and Session settings distinct surfaces;
- keep the existing right-rail Session settings entry as the panel entry point;
- reserve a shell-owned panel with Session Info, Balance & Assets, Spreads &
  Commissions, and Date Range placeholder groups;
- keep all controls disabled or inert until a session-settings owner exists;
- preserve chart host, left drawing rail, right utility rail, pane status/OHLC,
  reset view, floating transport, bottom account/trading chrome, and footer
  status bar placement;
- keep dashboard row-action visibility unchanged.

## Ownership Boundary

Allowed:

- shell markup and CSS for a right-rail anchored Session settings panel;
- disabled/inert placeholder fields, toggles, and buttons;
- browser coverage for panel open/close behavior, inert controls, non-overlap,
  and existing workstation chrome stability.

Forbidden:

- dispatching session-settings, orders, calendar, chart, replay, bar-data,
  default-wall, display-timeframe, or viewport commands from the panel;
- importing settings, orders, calendar, chart-engine, chart-data,
  chart-viewport, replay, bar-data, default-wall, or account/analytics owner
  modules into a session-settings panel controller;
- persisting session settings before an owner contract exists;
- exposing Order or Calendar row actions;
- using the chart settings modal as the Session settings surface.

## Acceptance For Step 126

- right-rail session settings panel browser smoke passes;
- bottom chrome regression audit browser smoke still passes;
- workstation rail regression audit browser smoke still passes;
- workstation chart presentation re-audit smoke still passes;
- dashboard row-action visibility remains Summary, Stats, Copy, and Journal;
- boundary smoke passes.

## Verification

- `node v6/tests/workstation-chart-slice-selection-step125-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-rail-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
