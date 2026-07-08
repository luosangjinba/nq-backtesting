# V6 Pane-Local Reset View Controls - Step 163

## Decision

Step 163 accepts Pane-Local Reset View Controls.

Reset view / KXG reset is now pane-local. Each chart host renders its own reset
button, and the reset bridge dispatches `CHART_VIEWPORT_COMMANDS.RESET_VIEW`
for the clicked pane id only. Chart-data, bar-data, replay, and chart series
ownership remain unchanged.

## Accepted Behavior

- `main`, `secondary`, and `tertiary` chart hosts each include a
  `[data-v6-reset-view]` button with `data-v6-reset-pane-id`.
- App wiring mounts one `connectResetViewControl` bridge per reset button.
- `root.__v6ResetViewControl.resetView({ paneId })` remains available for
  existing smoke compatibility.
- Clicking the secondary reset button resets only the secondary viewport.
- Reset does not request bars, mutate chart-data, or move replay cursor state.

## Non-Goals

- No draggable pane resizing.
- No layout variant geometry beyond the existing vertical columns.
- No cross-pane symbol, interval, crosshair, time, or date-range sync.
- No simulated trading, comparison symbols, overlays, Order, or Calendar.

## Coverage

- `pane-local-reset-controls-step163-smoke.js` verifies reset dispatch payloads
  target the requested pane id.
- `pane-local-reset-controls-browser-step163-smoke.js` verifies secondary reset
  leaves main viewport manual while resetting secondary to default.
- Existing reset/KXG browser flow still passes for the main pane.

## Next Direction

Step 164 should make layout variants meaningful: two-pane vertical versus
horizontal, and three-pane columns/rows/stack variants should render distinct
chart surface geometry. Draggable pane resizing should follow after variant
geometry is stable.
