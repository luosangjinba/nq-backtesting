# V6 Workstation Chart Slice Selection - Step 122

Date: 2026-07-07

## Decision

The next bounded workstation/chart slice should be Bottom Account/Trading Chrome Reservation.

This follows the rail regression audit and the FXReplay UI parity priority
order. V6 already has a floating replay transport, but it still lacks the dense
bottom account/trading chrome called out by the guardrails. The next slice can
reserve that shell surface without adding trading behavior, order placement,
analytics calculations, replay ownership, chart ownership, or account state.

## Selected Slice

Step 123 should reserve an inert bottom account/trading chrome strip.

The slice should:

- keep the existing floating replay transport owned by the shell transport
  surface;
- add a separate dense bottom-edge account/trading shell strip;
- use disabled/inert placeholders for Buy, Sell, quantity, account balance,
  realized PnL, unrealized PnL, and analytics;
- preserve chart host, left drawing rail, right utility rail, pane status/OHLC,
  reset view, and transport placement;
- keep dashboard row-action visibility unchanged.

## Ownership Boundary

Allowed:

- shell markup and CSS for the bottom chrome reservation;
- disabled/inert placeholder controls and readouts;
- browser coverage for non-overlap with chart host, rails, status/readout,
  reset view, and floating transport.

Forbidden:

- dispatching orders, chart, replay, bar-data, default-wall, display-timeframe,
  or viewport commands from the bottom account/trading strip;
- importing orders, chart-engine, chart-data, chart-viewport, replay, bar-data,
  default-wall, or account/analytics owner modules into a bottom-chrome
  controller;
- making Buy, Sell, quantity, account balance, PnL, or analytics interactive
  before owner contracts exist;
- exposing Order or Calendar row actions;
- moving replay transport ownership into chart runtime or trading/account
  chrome.

## Acceptance For Step 123

- bottom account/trading chrome browser smoke passes;
- rail regression audit browser smoke still passes;
- workstation chart presentation re-audit smoke still passes;
- dashboard row-action visibility remains Summary, Stats, Copy, and Journal;
- boundary smoke passes.

## Verification

- `node v6/tests/workstation-chart-slice-selection-step122-smoke.js`
- `node v6/tests/workstation-rail-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
