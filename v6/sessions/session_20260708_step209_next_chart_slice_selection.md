# V6 Session - Step 209 Next Chart Slice Selection

Date: 2026-07-08

## Completed

- Reviewed the Step 206-208 active-pane display-timeframe path.
- Selected Pane-Local Symbol/TF/OHLC Header State Sync as the next bounded
  chart-facing slice.
- Documented owner boundaries for pane runtime, chart surface, shell
  pane-status readout, display-timeframe runtime, chart-data runtime, and
  replay runtime.
- Kept custom intervals, interval sync, symbol picker UI, indicators, Pine
  Script, and trading/order behavior out of scope.

## Commits

- `90968948 docs(v6): select step 210 chart slice`

## Verification

- `node v6/tests/next-chart-slice-selection-step209-smoke.js`
- `node v6/tests/pane-status-readout-step183-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

## Next

Step 210 should implement Pane-Local Symbol/TF/OHLC Header State Sync. Start
from the existing `pane-status-readout` boundary, add browser coverage for real
multi-pane header isolation, and avoid adding symbol picker, custom interval,
indicator, Pine Script, or trading/order behavior.
