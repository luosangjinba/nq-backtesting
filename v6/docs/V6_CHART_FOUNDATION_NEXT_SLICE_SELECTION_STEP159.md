# V6 Chart Foundation Next Slice Selection - Step 159

## Decision

Step 159 selects Layout Menu Owner Binding as the next bounded chart-facing
slice.

The immediate user-visible gap is that the Page layout menu exposes layout
presets and sync switches, but every control is disabled and intentionally
inert. V6 already has a layout runtime with `setMode`, `setActivePane`, and
`setSync` commands, so the next useful slice is to connect the shell menu to
that owner without letting the shell directly mutate chart, replay, bars, or
viewport state.

## Selected Step 160

Step 160 should implement Layout Menu Owner Binding.

Owner boundary:

- Shell/UI controller owns DOM events, selected button state, labels, and
  accessibility attributes.
- Layout runtime owns layout mode, active pane, and sync flags.
- Pane/chart surface behavior remains unchanged in Step 160.

Expected behavior:

- Layout preset buttons are no longer disabled.
- Clicking a preset dispatches `LAYOUT_COMMANDS.SET_MODE`.
- Sync switches are no longer disabled.
- Toggling a switch dispatches `LAYOUT_COMMANDS.SET_SYNC`.
- UI state is refreshed from `LAYOUT_COMMANDS.GET_SNAPSHOT` and layout events.
- The current chart foundation remains visually stable; Step 160 does not add
  or remove chart panes.

Non-goals:

- Do not implement actual chart pane reflow or new chart host creation.
- Do not sync symbol, interval, crosshair, time, or date range behavior across
  charts yet.
- Do not mutate chart-data, chart-viewport, chart-engine, chart-history,
  replay, or bar-data state from shell code.
- Do not add simulated trading, Order, Calendar, comparison symbols, overlays,
  indicators, or unrelated workstation chrome behavior.

## Required Coverage

- A controller/model smoke proving preset and sync UI intents dispatch only
  layout commands.
- A browser smoke proving the controls are clickable, visible checked/selected
  state changes, and chart foundation geometry remains stable.
- Existing `layout-runtime-smoke.js` still passes.
- Existing `top-toolbar-parity-browser-smoke.js` should be updated from disabled
  placeholder expectations to owner-bound layout expectations.
- Step 158 chart foundation integration re-audit still passes.

## Rationale

This slice directly addresses the current inert Page layout menu while staying
inside the already-defined layout owner boundary. It improves real chart
usability without jumping into the larger and riskier work of actual multi-pane
chart creation, cross-pane synchronization, simulated trading, or overlays.
