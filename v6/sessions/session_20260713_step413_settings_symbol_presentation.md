# Session - Step 413 Settings Symbol Presentation

Date: 2026-07-13

## Completed

- checked official Lightweight Charts candlestick and price-format options;
- upgraded Settings to schema v5 and added the transactional Symbol tab;
- mapped body, border, wick, and decimal precision to native series options;
- routed committed preferences through a focused bridge and the chart-owned
  multi-pane series path;
- covered active-tab Reset, Cancel, OK, persistence, and hard reload.
- corrected the visual acceptance findings by aligning all candle color columns
  and making wicks an always-visible, color-only setting.

## Commits

- `32ee2a44 feat(v6): version symbol presentation settings`
- `f88cef06 feat(v6): apply symbol candle presentation`
- `24360bb7 feat(v6): apply symbol price precision`
- final Step 413 browser/governance commit

## Verification

- `node v6/tests/settings-symbol-model-step413-smoke.js`
- `node v6/tests/symbol-settings-options-step413-smoke.js`
- `node v6/tests/settings-symbol-chart-surface-bridge-step413-smoke.js`
- `node v6/tests/chart-host-manager-smoke.js`
- `node v6/tests/settings-symbol-browser-step413-smoke.js`
- adjacent Settings browser tests
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Implement Step 414 Status Line Presentation through the Status Readout owner.

## Visual Acceptance

The first pass found color swatches in different columns and an invalid Wick
visibility control. Commits `3755d37d` and `e03fde14` corrected both findings.
The final human visual recheck passed; Step 413 is closed.
