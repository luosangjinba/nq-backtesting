# V6 Workstation Chart Slice Selection - Step 134

Date: 2026-07-07

## Decision

The next bounded workstation/chart slice should be Screenshot/Export Owner
Contract.

The session-settings owner contract is now in place, and the updated parity
gap audit still calls for explicit owners before deferred toolbar controls
become interactive. Screenshot/export is the narrowest remaining owner contract
family because the workstation already has a disabled top-toolbar Screenshot
placeholder, while no export owner exists yet.

## Selected Slice

Step 135 should establish a screenshot/export owner contract without making the
top-toolbar Screenshot button interactive.

The slice should:

- define a focused screenshot/export contract module;
- define explicit export request fields such as source surface, format,
  filename, dimensions, background, and metadata;
- define default read-only export intent state and validation helpers for
  future owner wiring;
- keep the top-toolbar Screenshot button disabled and inert;
- avoid screenshot capture, canvas reads, downloads, browser storage, or
  persistence until a screenshot/export runtime/repository owner is explicitly
  selected;
- preserve diagnostics visibility cleanup, chart host, left drawing rail, right
  utility rail, right-rail Session settings panel, bottom account/trading
  chrome, floating transport, footer status bar, and dashboard row-action
  visibility.

## Ownership Boundary

Allowed:

- a focused `screenshot-export` contract/domain module;
- pure validation/default-intent helpers;
- contract smoke coverage and static boundary checks;
- docs/test updates that name the future owner boundary.

Forbidden:

- enabling the top-toolbar Screenshot button;
- capturing screenshots, reading canvases, creating downloads, writing files,
  or using browser storage;
- dispatching screenshot/export, chart, replay, bar-data, default-wall,
  display-timeframe, viewport, session-settings, orders, or calendar commands
  from toolbar selection code;
- importing chart-engine, chart-data, chart-viewport, replay, bar-data,
  default-wall, display-timeframe, settings, session-settings, orders,
  calendar, account, analytics, persistence, V4, vendor, or Lightweight Charts
  modules into a screenshot/export contract;
- changing dashboard visible row actions from Summary, Stats, Copy, and
  Journal.

## Acceptance For Step 135

- new screenshot/export contract smoke passes;
- Step 134 slice selection smoke passes;
- session-settings contract smoke passes;
- diagnostics visibility cleanup browser smoke still passes;
- right-rail Session settings panel regression audit smoke still passes;
- bottom chrome regression audit browser smoke still passes;
- workstation chart presentation re-audit smoke still passes;
- dashboard row-action visibility remains Summary, Stats, Copy, and Journal;
- boundary smoke passes.

## Verification

- `node v6/tests/workstation-chart-slice-selection-step134-smoke.js`
- `node v6/tests/session-settings-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step132-smoke.js`
- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
