# V6 Layout Menu Owner Binding - Step 160

## Decision

Step 160 accepts Layout Menu Owner Binding.

The Page layout menu is no longer an inert placeholder. Layout preset buttons
and sync switches are clickable and are bound to `layout-runtime` through a
focused shell controller. The controller owns DOM state and dispatches only
layout commands; it does not mutate chart, replay, bar-data, chart-data,
chart-viewport, chart-history, or chart-engine state.

## Accepted Behavior

- Layout preset buttons dispatch `LAYOUT_COMMANDS.SET_MODE`.
- Layout sync switches dispatch `LAYOUT_COMMANDS.SET_SYNC`.
- Initial UI state is read from `LAYOUT_COMMANDS.GET_SNAPSHOT`.
- The menu listens to layout events and refreshes selected/checked state.
- The existing chart surface and chart host geometry remain stable when layout
  menu controls are clicked.
- Step 160 does not create/destroy chart panes and does not implement
  cross-pane symbol, interval, crosshair, time, or date-range synchronization.

## Coverage

- `layout-menu-control-smoke.js` proves the controller dispatches only layout
  commands and reflects layout state.
- `layout-menu-owner-binding-browser-step160-smoke.js` proves browser-visible
  layout controls are clickable, layout-runtime state changes, and chart
  geometry remains stable.
- `top-toolbar-parity-browser-smoke.js` now expects owner-bound clickable layout
  controls instead of disabled placeholders.

## Next Direction

Step 161 should implement the layout pane surface reflow boundary: layout mode
changes may affect chart pane host presentation, but ownership must stay inside
layout runtime and chart-engine/chart-surface boundaries.
