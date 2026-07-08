# V6 Workstation Chart Slice Selection - Step 130

Date: 2026-07-07

## Decision

The next bounded workstation/chart slice should be Diagnostics Visibility
Cleanup.

Step 129 refreshed the workstation UI parity classification and identified the
only leading shell-only gap in the normal workstation chrome: readiness
runtime/command/gate telemetry remains visible in the top header. This also
matches `V6_PRODUCT_TOP_CHROME.md`, which says the workstation top chrome is a
product surface, not a diagnostics board.

## Selected Slice

Step 131 should move readiness diagnostics out of the normal workstation header
reading path without weakening readiness state or smoke-test coverage.

The slice should:

- keep a compact user-facing readiness summary in top chrome;
- remove runtime count, command count, gate count, and gate-list telemetry from
  the default visible header path;
- keep readiness controller state available for tests and future developer
  tooling;
- preserve `System ready`, `System warming up`, `Replay workstation is ready`,
  and `Some services are still starting` as allowed user-facing text;
- prevent test filenames, command IDs, runtime IDs, gate names, and latency
  labels from appearing in the normal body text;
- preserve chart host, left drawing rail, right utility rail, Session settings
  panel, bottom account/trading chrome, floating transport, footer status bar,
  and dashboard row-action visibility.

## Ownership Boundary

Allowed:

- shell markup/CSS changes that hide or relocate readiness diagnostics from the
  default visible header path;
- readiness surface/controller adjustments that keep the public readiness state
  and smoke harness available;
- browser coverage for default body text, compact readiness copy, and existing
  workstation chrome stability.

Forbidden:

- dispatching chart, replay, bar-data, default-wall, display-timeframe,
  viewport, session-settings, orders, or calendar commands from diagnostics
  cleanup code;
- importing chart-engine, chart-data, chart-viewport, replay, bar-data,
  default-wall, session-settings, orders, or calendar owners into the readiness
  surface;
- weakening readiness state assertions or hiding failures from tests;
- implementing developer diagnostics mode beyond the minimum visibility
  cleanup;
- exposing Order or Calendar row actions;
- changing dashboard visible row actions from Summary, Stats, Copy, and
  Journal.

## Acceptance For Step 131

- diagnostics visibility cleanup browser smoke passes;
- app shell browser smoke keeps passing with updated default-visible
  diagnostics expectations;
- workstation UI parity gap re-audit smoke still passes or is updated with the
  accepted cleanup result;
- bottom chrome regression audit browser smoke still passes;
- right-rail Session settings panel regression audit smoke still passes;
- workstation chart presentation re-audit smoke still passes;
- dashboard row-action visibility remains Summary, Stats, Copy, and Journal;
- boundary smoke passes.

## Verification

- `node v6/tests/workstation-chart-slice-selection-step130-smoke.js`
- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
