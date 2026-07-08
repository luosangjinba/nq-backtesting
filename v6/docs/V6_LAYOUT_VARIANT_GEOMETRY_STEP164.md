# V6 Layout Variant Geometry - Step 164

## Decision

Step 164 accepts Layout Variant Geometry Boundary.

The Page layout menu now persists the selected layout variant through
`layout-runtime`, and the chart surface applies that variant as chart-host
geometry. Layout state owns the selected mode/variant. Chart engine owns the DOM
geometry needed to display the visible pane hosts.

## Accepted Behavior

- `LAYOUT_COMMANDS.SET_MODE` accepts `{ mode, variant }`.
- `layout-store` normalizes unsupported variants out of the selected mode.
- The layout menu reflects the selected variant with `aria-checked` and root
  `data-layout-variant`.
- The chart surface exposes `data-v6-chart-layout-variant`.
- Two-pane variants are distinct:
  - `twice-vertical`: main and secondary panes are side by side.
  - `twice-horizontal`: main and secondary panes are stacked in rows.
- Three-pane variants are distinct:
  - `triple-columns`: three columns.
  - `triple-rows`: three rows.
  - `triple-right-stack`: main pane spans the left side, secondary and tertiary
    stack on the right.
  - `triple-left-stack`: secondary and main stack on the left, tertiary spans
    the right side.

## Boundaries

- Layout runtime owns selected mode and variant state.
- Layout surface bridge only forwards layout snapshots and bootstraps visible
  panes.
- Chart surface owns pane host visibility, slot metadata, and CSS `grid-area`.
- Bar-data, chart-data, replay, chart-history, and chart-viewport ownership are
  unchanged.
- Step 164 does not add draggable pane resizing or persisted layout size ratios.

## Coverage

- `layout-runtime-smoke.js` verifies variant normalization and rejection.
- `layout-menu-control-smoke.js` verifies menu variant dispatch and selection.
- `layout-pane-surface-reflow-step161-smoke.js` verifies chart surface dataset,
  visible pane slots, and grid areas.
- `layout-variant-geometry-browser-step164-smoke.js` verifies browser-level
  computed grid templates and per-host grid areas for all accepted variants.
- Step 160/161/162/163 browser smokes still pass.

## Next Direction

Step 165 should add pane resize dragging through the chart-surface boundary.
The resize work should preserve the selected layout variant and keep resize
state local to presentation unless a later step explicitly accepts persistence.
