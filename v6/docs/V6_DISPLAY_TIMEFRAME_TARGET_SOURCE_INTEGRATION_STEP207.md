# V6 Display-Timeframe Target Source Integration - Step 207

## Outcome

Step 207 connects the existing shell display-timeframe control to the real
active pane source.

The chart surface now publishes pane activation when a user interacts with a
pane host. A chart-engine bridge translates that owner event into
`PANE_COMMANDS.SET_ACTIVE`, and a shell bridge listens to
`PANE_EVENTS.ACTIVE_CHANGED` to update the display-timeframe control target.
Selecting `5m` from the visible top toolbar therefore applies to the active
pane instead of a hard-coded or test-only target.

## Owner Boundary

- Chart surface owns pane-host user interaction detection and publishes
  pane-activation events.
- `pane-active-surface-bridge` is the only new bridge that writes active-pane
  intent to pane runtime.
- Pane runtime remains the source of active pane state.
- `display-timeframe-pane-target-bridge` mirrors pane active changes into the
  shell display-timeframe control target.
- Display-timeframe runtime still owns projection and chart-data replacement.
- The shell control still owns menu DOM behavior and command dispatch shape.

## Implemented

- `workstation-chart-surface` now tracks `activePaneId`, marks active pane host
  dataset state, and exposes `subscribePaneActivation(handler)`.
- `pane-active-surface-bridge` dispatches `PANE_COMMANDS.SET_ACTIVE` from chart
  surface pane activation events.
- `display-timeframe-pane-target-bridge` initializes from
  `PANE_COMMANDS.GET_ACTIVE` and subscribes to `PANE_EVENTS.ACTIVE_CHANGED`.
- App wiring mounts both bridges and exposes them for browser smoke
  observability.
- `display-timeframe-active-pane-browser-step207-smoke.js` clicks the
  secondary pane, selects `5m` from the visible top toolbar, and proves only
  the active secondary pane is projected to 5-minute bars.
- The Step 207 browser smoke is included in the chart browser regression pack.

## Non-Goals

- Do not add custom intervals.
- Do not implement interval sync.
- Do not implement indicators or Pine Script.
- Do not implement symbol/TF/OHLC editor UI.
- Do not change chart-data projection ownership.
- Do not add trading or order behavior.

## Next Recommendation

Step 208 should keep the same owner boundary and sync the top-toolbar
display-timeframe label/readout to the newly active pane's existing
`displayTimeframe`. This is still not richer TF UI; it only prevents the top
toolbar from showing stale TF state when the user switches panes.
