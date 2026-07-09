# V6 Next Chart Slice Selection - Step 209

## Decision

Step 210 should implement **Pane-Local Symbol/TF/OHLC Header State Sync**.

This is a bounded chart-presentation slice. It should make the already visible
per-pane header state explicit and testable after the Step 206-208 active-pane
display-timeframe work. It is not a symbol picker, interval editor, custom
timeframe system, indicator system, Pine Script bridge, or trading/order slice.

## Why This Slice

Steps 206-208 completed the first active-pane toolbar path:

- Step 206 added an explicit target pane id to the display-timeframe control.
- Step 207 connected chart-surface pane activation to the display-timeframe
  target.
- Step 208 synced the visible top-toolbar timeframe text from the active pane
  without projecting or replacing chart data on pane switch.

The next user-visible gap is pane-local presentation consistency. Each pane
must be able to show its own symbol, timeframe, and OHLC readout without
bleeding state into another pane. The existing `pane-status-readout` module
already owns DOM-only header rendering, so Step 210 should reinforce that
boundary and add browser coverage around real workstation pane changes.

## Owner Boundaries

- Pane runtime owns pane identity and pane intent state such as instrument and
  display timeframe.
- Chart surface owns crosshair-selected bar payloads and publishes pane-scoped
  crosshair events.
- Shell pane-status readout owns DOM text, datasets, and presentation state for
  per-pane headers only.
- Display-timeframe runtime remains the only owner that projects bars after a
  user applies a display timeframe.
- Chart-data runtime remains the only owner that writes bar series data.
- Replay runtime remains the owner of replay cursor and reveal state.

## Step 210 Scope

Implement Pane-Local Symbol/TF/OHLC Header State Sync:

- verify that pane headers render symbol and timeframe from pane-scoped runtime
  state, not from a global toolbar assumption;
- verify that OHLC readouts stay scoped to the pane that produced the crosshair
  bar;
- verify that active-pane changes do not clear or overwrite another pane's
  header state;
- add browser coverage for a secondary or tertiary pane with different
  symbol/timeframe/OHLC state;
- keep the top toolbar as an active-pane control/readout, not the owner of
  pane-local header state.

## Non-Goals

- Do not implement custom intervals.
- Do not implement interval sync behavior.
- Do not implement a symbol search/picker.
- Do not implement indicator UI, indicator rendering, or Pine Script support.
- Do not implement trading, order tickets, position state, or pseudo-live
  simulation behavior.
- Do not make route or shell entry files the owner of chart series, bar-data
  requests, replay cursor state, or pane runtime state.
