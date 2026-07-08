# V6 Pane-Local Status Readout - Step 183

## Decision

Step 183 moves chart header symbol, timeframe, and OHLC display to pane-local
readouts.

Each chart pane now owns a visible readout inside its chart host. Mixed layouts
can display different pane metadata at the same time, such as `NQ 1m`, `ES 5m`,
and `YM 15m`. OHLC remains hidden until that pane receives a crosshair-selected
candle.

## Boundary

- `pane-status-readout` is a shell UI controller. It renders DOM-only readouts
  and subscribes to runtime events.
- Pane metadata updates come from pane events.
- OHLC updates come from `chartSurface:crosshairChanged` for the matching
  `paneId`.
- The global footer/status controller no longer writes pane-local readout
  elements when pane-local readouts are present.
- Chart-engine still owns chart series writes and crosshair normalization.
- Replay, bar-data, chart-data, viewport, layout, and pane runtimes were not
  given new UI responsibilities.

## Accepted Behavior

- Every chart host has one pane-local readout.
- Each readout shows its own symbol and timeframe.
- Each readout shows OHLC only for its own selected crosshair candle.
- Clearing crosshair on one pane clears only that pane's OHLC.
- Other pane readouts retain their own symbol, timeframe, and OHLC state.
- OHLC color remains direction-based: up green, down red, flat neutral.

## Coverage

- `pane-status-readout-step183-smoke.js` covers pane-local metadata, OHLC,
  direction, and per-pane clear behavior without browser dependencies.
- `pane-status-readout-browser-step183-smoke.js` covers real app DOM with three
  visible panes and independent pane-local readouts.
- `chart-browser-regression-pack.js` now includes the pane-local status readout
  browser smoke.
- Step 153 crosshair browser smoke still passes with the new pane-local readout
  DOM.

## Verification

- `node v6/tests/pane-status-readout-step183-smoke.js`
- `node v6/tests/status-readout-controller-smoke.js`
- `node v6/tests/pane-status-readout-browser-step183-smoke.js`
- `node v6/tests/crosshair-ohlc-readout-browser-step153-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next Direction

Step 184 should add the replay-safe leftward history latency gate that was
previously planned as Step 183. It should prove canvas-left history requests
remain bounded and replay does not visibly stall while historical bars are
extended.
