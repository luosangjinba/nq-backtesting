# V6 Pane-Local Symbol/TF/OHLC Header State Sync - Step 210

## Outcome

Step 210 makes per-pane chart header state explicit and covered at browser
level.

The shell-owned `pane-status-readout` now tracks active pane presentation state
per header. Active-pane changes update only the header active dataset and leave
each pane's symbol, timeframe, and OHLC values intact. This keeps the per-pane
header readout independent from the top toolbar while preserving the Step
206-208 active-pane display-timeframe control behavior.

## Implemented

- `pane-status-readout` subscribes to `PANE_EVENTS.ACTIVE_CHANGED`.
- Per-pane readouts expose `data-v6-pane-active="true|false"`.
- Active-pane changes render all pane headers without clearing or overwriting
  another pane's symbol, timeframe, or OHLC state.
- `pane-status-readout-step183-smoke.js` covers active-pane header state
  without metadata/OHLC bleed.
- `pane-local-header-state-browser-step210-smoke.js` uses real pane runtime
  commands to set different symbol/timeframe state for `main`, `secondary`,
  and `tertiary`, injects pane-scoped crosshair OHLC payloads, switches the
  active pane, and verifies all headers remain isolated.
- The Step 210 browser smoke is included in the chart browser regression pack.

## Boundary Notes

- Shell pane-status readout owns DOM text and datasets only.
- Pane runtime remains the source for pane instrument, display timeframe, and
  active pane state.
- Chart surface remains the source for pane-scoped crosshair OHLC payloads.
- Display-timeframe runtime remains the only owner that projects bars after a
  user applies a display timeframe.
- Chart-data runtime remains the only owner that writes bar series data.
- Replay runtime remains the owner of replay cursor and reveal state.

## Non-Goals

- No symbol picker UI was added.
- No custom intervals or interval sync behavior were added.
- No indicator UI, indicator rendering, or Pine Script support was added.
- No trading, order tickets, position state, or pseudo-live simulation behavior
  was added.

## Next Recommendation

Step 211 should select the next bounded chart-facing slice before implementation.
Good candidates are:

- audit whether top-toolbar symbol presentation should mirror active pane state
  the same way display timeframe now does;
- select a minimal pane-local symbol control owner contract;
- pause UI expansion and review chart foundation risks before richer controls.

Do not start custom intervals, interval sync, indicators, Pine Script, or
trading/order behavior without a new selection/audit step.
