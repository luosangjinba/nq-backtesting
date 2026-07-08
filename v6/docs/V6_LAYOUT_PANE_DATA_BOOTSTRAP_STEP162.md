# V6 Layout Pane Data Bootstrap - Step 162

## Decision

Step 162 accepts Layout Pane Data Bootstrap Boundary.

When layout mode exposes additional chart pane hosts, V6 now bootstraps their
chart-data and chart-viewport state through existing owner commands. The
implementation does not request bars, mutate replay cursor state, write chart
series directly, or add cross-pane sync behavior.

## Accepted Behavior

- `layout-pane-bootstrap-runtime` registers
  `LAYOUT_PANE_BOOTSTRAP_COMMANDS.BOOTSTRAP_VISIBLE`.
- `layout-surface-bridge` triggers bootstrap after a layout snapshot reveals
  more than one pane host.
- Bootstrap picks an already visible pane with revealed bars as the source
  record and copies those already-revealed bars to newly visible pane ids.
- Chart-data mutation uses `CHART_DATA_COMMANDS.REPLACE_BARS`.
- Viewport intent/projection uses `CHART_VIEWPORT_COMMANDS.ENSURE_INTENT` and
  `CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION`.
- Chart series writes still happen only through chart-engine bridges reacting
  to chart-data and chart-viewport events.

## Non-Goals

- No new bar requests and no bar-data cache mutation.
- No replay cursor movement.
- No cross-pane symbol, interval, crosshair, time, or date-range sync.
- No simulated trading, comparison symbols, overlays, Order, or Calendar.
- No pane resize drag handles.
- No pane-local reset buttons yet.

## Coverage

- `layout-pane-bootstrap-runtime-smoke.js` verifies visible pane bootstrap,
  chart-data copy isolation, viewport projection, and skip behavior.
- `layout-pane-data-bootstrap-browser-step162-smoke.js` verifies browser-visible
  secondary and tertiary panes receive chart-data and viewport state after
  layout mode changes.
- `layout-surface-bridge-smoke.js` verifies the bridge triggers bootstrap
  without dispatching bar-data, chart-data, chart-viewport, or replay commands
  directly.

## Next Direction

Step 163 should implement pane-local reset view / KXG reset controls. Each
visible pane should own a reset button that targets only that pane's viewport
record.
