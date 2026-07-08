# V6 Pane Resize Drag - Step 165

## Decision

Step 165 accepts Pane Resize Drag Boundary.

Visible pane boundaries are now draggable through chart-surface-owned handles.
Resize ratios are presentation-local state keyed by the active layout variant.
The layout runtime continues to own selected mode/variant, while chart surface
owns pane geometry and chart resize calls.

## Accepted Behavior

- Two-pane vertical and horizontal variants expose one resize handle.
- Three-column and three-row variants expose two resize handles.
- Left-stack and right-stack variants expose one column handle and one row
  handle for the stacked side.
- Dragging a handle updates `chart-pane-layer` grid templates using local
  ratios.
- Dragging calls the existing chart surface resize path so Lightweight Charts
  canvases are resized after geometry changes.
- Resize ratios are not persisted.

## Boundaries

- Chart surface owns resize handles, pointer events, ratio state, and chart
  resize calls.
- Layout runtime owns only selected mode/variant and sync state.
- Bar-data, chart-data, replay, chart-history, and chart-viewport ownership are
  unchanged.
- Step 165 does not implement symbol, interval, crosshair, time, or date-range
  sync effects.

## Coverage

- `pane-resize-model-step165-smoke.js` verifies ratio math and handle specs.
- `pane-resize-chart-surface-step165-smoke.js` verifies chart-surface handle
  creation, ratio updates, and cleanup.
- `pane-resize-drag-browser-step165-smoke.js` verifies browser-level handle
  creation and grid-template updates.
- Step 161/162/163/164 browser smokes still pass.

## Next Direction

Step 166 should connect selected Page layout sync toggles to bounded chart
effects, starting with sync behavior that does not require bar-data reloads.
