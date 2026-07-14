# Session - Step 413 Settings Symbol Presentation

Date: 2026-07-13

## Completed

- checked official Lightweight Charts candlestick and price-format options;
- upgraded Settings to schema v5 and added the transactional Symbol tab;
- mapped body, border, wick, and decimal precision to native series options;
- routed committed preferences through a focused bridge and the chart-owned
  multi-pane series path;
- covered active-tab Reset, Cancel, OK, persistence, and hard reload.

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

Complete the human Symbol visual matrix. After acceptance, implement Step 414
Status Line Presentation through the Status Readout owner.
