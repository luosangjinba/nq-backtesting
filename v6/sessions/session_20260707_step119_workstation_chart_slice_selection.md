# V6 Session - Step 119 Workstation Chart Implementation Slice Selection

Date: 2026-07-07

## Outcome

Step 119 selected Left Drawing Rail Reservation as the next bounded
workstation/chart implementation slice.

Completed in commit:

- `ff2cad47 docs(v6): select left drawing rail slice`

## Selection

Step 120 should add an inert shell-owned left drawing/tool rail. The rail should
reserve the FXReplay-like chart-side tool strip without implementing drawing
behavior or crossing runtime boundaries.

## Boundaries

- Shell markup and CSS are allowed.
- Tool buttons must stay disabled or inert until a drawing/tool owner exists.
- The rail must not dispatch chart, replay, bar-data, default-wall,
  display-timeframe, or viewport commands.
- The rail must not import chart-engine or runtime owner modules.
- Dashboard row-action visibility remains unchanged.

## Verification

- `node v6/tests/workstation-chart-slice-selection-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/chart-toolbar-cleanup-browser-smoke.js`
- `node v6/tests/right-utility-rail-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next Step

Step 120 should implement the inert left drawing rail reservation with browser
coverage and no runtime ownership.
