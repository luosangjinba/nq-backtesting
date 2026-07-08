# V6 Workstation Chart Slice Selection - Step 132

Date: 2026-07-07

## Decision

The next bounded workstation/chart slice should be Session Settings Owner
Contract.

Diagnostics visibility cleanup is complete, and the updated workstation parity
gap audit asks for one deferred owner contract family before more interactive
workstation controls are enabled. Session settings is the smallest next owner
contract because V6 already has an inert right-rail Session settings panel with
clear fields, while no session-settings owner exists yet.

## Selected Slice

Step 133 should establish a session-settings owner contract without making the
right-rail panel interactive.

The slice should:

- define a session-settings contract module with explicit fields for Session
  Info, Balance & Assets, Spreads & Commissions, and Date Range;
- define default/read-only draft state and validation helpers for future owner
  wiring;
- keep the right-rail Session settings panel disabled and inert;
- keep Chart Settings and Session settings distinct surfaces;
- avoid persistence until a session-settings runtime/repository owner is
  explicitly selected;
- preserve diagnostics visibility cleanup, chart host, left drawing rail, right
  utility rail, bottom account/trading chrome, floating transport, footer
  status bar, and dashboard row-action visibility.

## Ownership Boundary

Allowed:

- a focused `session-settings` contract/domain module;
- pure validation/default-state helpers;
- contract smoke coverage and static boundary checks;
- docs/test updates that name the future owner boundary.

Forbidden:

- dispatching session-settings, chart, replay, bar-data, default-wall,
  display-timeframe, viewport, orders, or calendar commands from the panel;
- enabling right-rail Session settings controls;
- persisting Session settings values;
- importing chart-engine, chart-data, chart-viewport, replay, bar-data,
  default-wall, settings, orders, calendar, account, or analytics owners into a
  session-settings contract or shell panel;
- reusing Chart Settings as the Session settings surface;
- exposing Order or Calendar row actions;
- changing dashboard visible row actions from Summary, Stats, Copy, and
  Journal.

## Acceptance For Step 133

- new session-settings contract smoke passes;
- Step 132 slice selection smoke passes;
- diagnostics visibility cleanup browser smoke still passes;
- right-rail Session settings panel regression audit smoke still passes;
- bottom chrome regression audit browser smoke still passes;
- workstation chart presentation re-audit smoke still passes;
- dashboard row-action visibility remains Summary, Stats, Copy, and Journal;
- boundary smoke passes.

## Verification

- `node v6/tests/workstation-chart-slice-selection-step132-smoke.js`
- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step130-smoke.js`
- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
