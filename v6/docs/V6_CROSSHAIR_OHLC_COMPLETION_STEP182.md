# V6 Crosshair OHLC Completion - Step 182

## Decision

Step 182 accepts the current crosshair OHLC behavior as complete for this V6
chart foundation pass.

The readout remains driven only by chart-surface crosshair events. OHLC values
stay hidden until a selected candle is available, and selected OHLC values are
colored by candle direction:

- up candle: green;
- down candle: red;
- flat candle: neutral.

## Boundary

- `lightweight-chart-adapter` still owns the direct Lightweight Charts
  crosshair subscription and selected-bar normalization.
- `workstation-chart-surface` still owns pane-local crosshair records and
  `displayReadout` selection for hovered panes.
- `status-readout-model` still computes read-only OHLC text and candle
  direction from the selected crosshair bar.
- `status-readout` only renders text and data attributes for CSS styling.
- No chart, replay, bar-data, chart-data, viewport, layout, or pane ownership
  changed in this step.

## Coverage

- `status-readout-controller-smoke.js` now covers up, down, flat, and empty
  crosshair OHLC direction states.
- `crosshair-ohlc-readout-browser-step153-smoke.js` covers single-pane selected
  OHLC values, direction color, and no duplicate symbol/timeframe label.
- `multi-pane-crosshair-readout-browser-step154-smoke.js` now covers hovered
  pane color behavior for both up and down pane data.
- `chart-browser-regression-pack.js` continues to cover the selected chart
  foundation browser gates.

## Verification

- `node v6/tests/status-readout-controller-smoke.js`
- `node v6/tests/multi-pane-crosshair-readout-step154-smoke.js`
- `node v6/tests/crosshair-ohlc-readout-browser-step153-smoke.js`
- `node v6/tests/multi-pane-crosshair-readout-browser-step154-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next Direction

Step 183 should add a replay-safe leftward history latency gate. The test should
prove history requests are triggered only from the canvas-left boundary and that
replay progress does not visibly stall while historical bars are being extended.
