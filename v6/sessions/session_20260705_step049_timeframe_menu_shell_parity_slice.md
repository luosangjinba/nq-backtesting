# V6 Step 49 - Timeframe Menu Shell Parity Slice

Date: 2026-07-05

## Scope

Step 49 replaced the native chart-toolbar timeframe select with a shell-owned
grouped floating interval menu while preserving display-timeframe runtime
ownership.

## Commits

- `846ce242 feat(v6): add timeframe menu parity shell`

## Implementation Notes

- Added a top-toolbar interval command that opens a floating grouped menu.
- Added seconds, minutes, hours, days, and `Add custom interval...` sections.
- Kept unsupported/custom intervals disabled or inert.
- Routed supported minute selections through the existing
  `DISPLAY_TIMEFRAME_COMMANDS.APPLY` command path.
- Replaced the old visible native select with a read-only timeframe readout.
- Added `v6/tests/timeframe-menu-parity-browser-smoke.js`.

## Verification

- `node v6/tests/timeframe-menu-parity-browser-smoke.js`
- `node v6/tests/display-timeframe-browser-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/status-readout-browser-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 50 should reserve the right utility rail outside the chart price scale and
tight to the screen edge, with inert shell entries for future panel/workflow
buttons.
