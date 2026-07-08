# V6 Session - Step 154 Multi-Pane Crosshair Readout

Date: 2026-07-08

## Completed

Step 154 implemented and gated multi-pane crosshair OHLC readout isolation.

Commits:

- `7b33d594 feat(v6): isolate multi-pane crosshair readout`
- `927f782f test(v6): cover multi-pane crosshair browser readout`

## Changes

- Added `displayReadout` to chart-surface crosshair events.
- Made the visible readout follow the hovered pane.
- Prevented non-current pane null crosshair events from clearing the visible
  OHLC readout.
- Added runtime and browser coverage for multi-pane crosshair isolation.

## Verification

- `node v6/tests/multi-pane-crosshair-readout-step154-smoke.js`
- `node v6/tests/multi-pane-crosshair-readout-browser-step154-smoke.js`
- `node v6/tests/crosshair-ohlc-readout-browser-step153-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/workstation-chart-surface-multi-pane-step147-smoke.js`
- `node v6/tests/multi-pane-chart-foundation-step147-smoke.js`
- `node v6/tests/status-readout-model-smoke.js`
- `node v6/tests/status-readout-controller-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 155 should harden multi-pane leftward historical extension isolation.
