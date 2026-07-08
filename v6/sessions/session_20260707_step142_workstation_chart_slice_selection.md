# V6 Session - Step 142 Workstation Chart Slice Selection

Date: 2026-07-07

## Outcome

Step 142 selected Comparison Symbol Owner Contract as the next bounded
workstation/chart slice.

Completed in commit:

- `63f62181 docs(v6): select comparison symbol contract slice`

## Decision

Step 143 should establish a comparison symbol owner contract before the
top-toolbar Add comparison symbol control becomes interactive.

The selected slice is intentionally bounded:

- define a focused comparison-symbol contract/domain module;
- define explicit comparison request fields;
- define supported display modes and scale modes;
- define default read-only comparison intent state and validation helpers;
- keep the top-toolbar Add comparison symbol button disabled and inert;
- do not perform symbol lookup, request bars, add comparison series, attach
  Lightweight Charts primitives/plugins, mutate chart/pane/viewport/replay
  state, persist values, use browser storage, or add runtime command wiring.

## Boundaries

- Dashboard visible row actions remain Summary, Stats, Copy, and Journal.
- Order and Calendar remain hidden.
- Existing owner contracts for session-settings, screenshot/export, indicators,
  drawing/action-history, and account/trading remain disabled/inert from the
  shell.
- The comparison symbol owner remains a contract-only boundary until a future
  chart-engine-owned integration slice is selected.

## Verification

- `node v6/tests/workstation-chart-slice-selection-step142-smoke.js`
- `node v6/tests/account-trading-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step140-smoke.js`
- `node v6/tests/drawing-action-history-contract-smoke.js`
- `node v6/tests/indicators-contract-smoke.js`
- `node v6/tests/screenshot-export-contract-smoke.js`
- `node v6/tests/session-settings-contract-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `git diff --check`

## Next Step

Step 143 should implement the Comparison Symbol Owner Contract.
