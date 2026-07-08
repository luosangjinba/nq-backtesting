# V6 Session - Step 131 Diagnostics Visibility Cleanup

Date: 2026-07-07

## Outcome

Step 131 moved readiness diagnostics out of the normal workstation header
reading path while preserving compact user-facing readiness state.

Completed in commit:

- `a6db00d5 feat(v6): clean up readiness diagnostics visibility`

## Implementation

- Readiness runtime, command, gate count, and gate-list telemetry remain in the
  DOM and controller state for tests and future tooling.
- Telemetry nodes are hidden from the default visible/header path with
  `hidden` and `aria-hidden="true"`.
- The top header keeps compact user-facing readiness state visible.
- The top bar grid now reserves a real column for readiness status instead of
  clipping the whole readiness context.
- Parity gap docs now mark diagnostics visibility cleanup complete for the
  current shell slice and point the next selection toward deferred owner
  contract families.

## Boundaries

- No chart, replay, bar-data, default-wall, display-timeframe, viewport,
  session-settings, orders, or calendar commands were dispatched from readiness
  cleanup code.
- No chart-engine, chart-data, chart-viewport, replay, bar-data, default-wall,
  session-settings, orders, or calendar owners were imported into readiness
  surface code.
- No developer diagnostics mode was implemented.
- Order and Calendar dashboard row actions remain hidden.
- Dashboard visible row actions remain Summary, Stats, Copy, and Journal.

## Verification

- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `node v6/tests/readiness-surface-controller-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step130-smoke.js`
- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next Step

Step 132 should select one deferred owner contract family unless a newly found
regression requires a narrower fix first.
