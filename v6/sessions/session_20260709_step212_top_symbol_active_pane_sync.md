# V6 Session - Step 212 Top Symbol Active Pane Sync

## Summary

Step 212 added a shell-owned read-only bridge that mirrors the active pane
symbol in the top toolbar.

Completed commits:

- `f82ffcda feat(v6): add top symbol active pane bridge`
- `f7932934 test(v6): cover top symbol active pane sync`

## Decisions

- Pane runtime remains the source of truth for pane instrument and active pane
  state.
- The top toolbar owns only presentation for `data-v6-top-symbol`.
- Pane-local headers remain owned by `pane-status-readout`.
- Symbol picker UI, comparison symbols, interval sync, indicators, Pine Script,
  chart-data requests, replay mutation, and trading/order behavior remain out
  of scope.

## Behavior

- On mount, the bridge reads `PANE_COMMANDS.GET_ACTIVE`.
- On `PANE_EVENTS.ACTIVE_CHANGED`, the top toolbar symbol changes to the new
  active pane instrument.
- On `PANE_EVENTS.SYMBOL_INTENT_CHANGED`, the toolbar updates only when the
  changed pane is the active pane.
- Symbol text is mirrored to `dataset.v6TopSymbol` for browser smoke coverage.

## Verification

- `node v6/tests/top-symbol-active-pane-bridge-step212-smoke.js`
- `node v6/tests/top-symbol-active-pane-browser-step212-smoke.js`
- `node v6/tests/pane-local-header-state-browser-step210-smoke.js`
- `node v6/tests/display-timeframe-active-pane-ui-state-browser-step208-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`
