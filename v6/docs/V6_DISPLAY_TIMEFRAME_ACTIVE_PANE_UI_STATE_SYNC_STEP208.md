# V6 Display-Timeframe Active Pane UI State Sync - Step 208

## Outcome

Step 208 keeps the existing top-toolbar display-timeframe control visually
aligned with the active pane.

When the active pane changes, `display-timeframe-pane-target-bridge` now mirrors
both the pane id and the pane's current `displayTimeframe` into the shell
control. This updates the visible toolbar text without dispatching
`DISPLAY_TIMEFRAME_COMMANDS.APPLY`, so merely switching panes does not project
bars or replace chart data.

## Implemented

- `mountDisplayTimeframeControl` exposes `setDisplayTimeframe(value)` for
  owner-side UI state synchronization.
- `display-timeframe-pane-target-bridge` reads `pane.displayTimeframe` from
  active pane records and calls `setDisplayTimeframe` after updating the target
  pane id.
- `display-timeframe-active-pane-ui-state-browser-step208-smoke.js` proves:
  - switching to a secondary pane with existing `5m` state updates the visible
    toolbar text to `5m`;
  - pane switching alone leaves main and secondary chart-data unchanged;
  - selecting a new timeframe afterward still projects only the active target
    pane.
- The Step 208 browser smoke is included in the chart browser regression pack.

## Boundary Notes

- Shell UI owns the display-timeframe control's DOM label/menu state.
- Pane runtime remains the source of pane `displayTimeframe`.
- Display-timeframe runtime remains the only path that projects chart data after
  a user applies a new timeframe.
- Step 208 does not add custom intervals, interval sync, indicators, Pine
  Script, symbol editing, OHLC editing, or trading/order behavior.

## Next Recommendation

Step 209 should be a small chart-slice selection step. The current likely
choices are:

- continue pane-local top-toolbar state for symbol/TF/OHLC presentation;
- add a minimal owner contract for pane-local symbol and interval UI selection;
- pause UI expansion and review chart foundation risks before moving toward
  indicators or richer controls.

Do not start custom intervals, indicators, Pine Script, or trading behavior
without a selection/audit step first.
