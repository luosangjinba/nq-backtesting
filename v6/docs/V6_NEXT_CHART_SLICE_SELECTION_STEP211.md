# V6 Next Chart Slice Selection - Step 211

## Decision

Step 212 should implement **Top-Toolbar Active-Pane Symbol Presentation Sync**.

This is a bounded shell presentation slice. It should make the existing
top-toolbar symbol text mirror the active pane's instrument in the same
read-only way that Step 208 made the top-toolbar display timeframe mirror the
active pane's display timeframe.

## Why This Slice

Steps 206-208 completed active-pane display-timeframe targeting and visible
toolbar label synchronization. Step 210 then made per-pane symbol, timeframe,
and OHLC headers isolated and browser-covered.

The remaining nearby inconsistency is the top toolbar symbol. The shell markup
still initializes `data-v6-top-symbol` as static `NQ`, while pane runtime can
already hold different pane instruments and pane headers can display them
independently. Before adding symbol picker UI or richer pane controls, V6
should first make the existing top-toolbar symbol presentation follow the same
active-pane source as the display-timeframe control.

## Owner Boundaries

- Pane runtime owns pane instrument and active pane state.
- Shell top toolbar owns only DOM text and read-only presentation state for the
  active pane symbol.
- Shell pane-status readout remains the owner of per-pane header DOM state.
- Chart-data runtime remains the only owner that writes bar series data.
- Bar-data runtime remains the only owner that requests and caches bars.
- Replay runtime remains the owner of replay cursor and reveal state.
- Display-timeframe runtime remains the only owner that projects bars after a
  display timeframe apply command.

## Step 212 Scope

Implement Top-Toolbar Active-Pane Symbol Presentation Sync:

- add a small shell-owned symbol readout control or bridge that updates
  `data-v6-top-symbol` from the current active pane;
- initialize from `PANE_COMMANDS.GET_ACTIVE`;
- update on `PANE_EVENTS.ACTIVE_CHANGED` and symbol intent changes for the
  active pane;
- do not dispatch pane symbol changes from the toolbar;
- do not request bars, replace chart data, project display timeframe bars, or
  mutate replay state;
- add unit and browser coverage proving active-pane symbol switching updates
  the top toolbar while pane headers remain pane-local.

## Non-Goals

- Do not implement symbol search or symbol picker UI.
- Do not implement comparison symbols.
- Do not implement custom intervals or interval sync behavior.
- Do not implement indicator UI, indicator rendering, or Pine Script support.
- Do not implement trading, order tickets, position state, or pseudo-live
  simulation behavior.
- Do not make route or shell entry files the owner of chart series, bar-data
  requests, replay cursor state, or pane runtime state.
