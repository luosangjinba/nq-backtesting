# V6 Layout Pane Surface Reflow - Step 161

## Decision

Step 161 accepts Layout Pane Surface Reflow Boundary.

Layout mode changes now flow from `layout-runtime` to the chart surface through
`layout-surface-bridge`. The chart surface owns the visible pane host
presentation for `single`, `twice`, and `triple` modes. Shell code does not
mutate chart data, viewport state, replay state, or bar-data state.

## Lightweight Charts Check

Lightweight Charts 5.2 documents built-in pane management, including adding
panes, moving series between panes, adjusting pane height, and removing panes.
The current V6 fit remains the established Step 147 pattern: one chart instance
per V6 pane host, coordinated through V6 pane-local runtimes and chart-engine
bridges. This avoids changing the chart ownership model mid-foundation.

The awesome-tradingview reference was also checked; it points to the official
Lightweight Charts docs and plugin ecosystem, but this step does not need a
plugin or custom series.

## Accepted Behavior

- The shell reserves three chart host slots: `main`, `secondary`, and
  `tertiary`.
- `workstation-chart-surface` exposes `applyLayoutSnapshot`.
- `layout-surface-bridge` reads `LAYOUT_COMMANDS.GET_SNAPSHOT` once and listens
  to `LAYOUT_EVENTS.MODE_CHANGED`.
- `single` shows one chart host, `twice` shows two, and `triple` shows three.
- Layout reflow triggers resize on visible mounted hosts only.
- Layout reflow does not call `setData`, `update`, or
  `setVisibleLogicalRange`.

## Non-Goals

- No secondary/tertiary K-line data bootstrap yet.
- No symbol, interval, crosshair, time, or date-range synchronization.
- No simulated trading, comparison symbols, overlays, Order, or Calendar.
- No bar requests outside bar-data.
- No replay cursor mutation outside replay runtime.
- No viewport intent mutation outside chart-viewport runtime.

## Coverage

- `layout-pane-surface-reflow-step161-smoke.js` verifies surface-owned host
  visibility, resize, and no chart data/viewport writes during layout reflow.
- `layout-surface-bridge-smoke.js` verifies the bridge uses only layout
  snapshot/mode events.
- `layout-pane-surface-reflow-browser-step161-smoke.js` verifies browser-visible
  layout mode state, host hidden/display flags, and chart surface layout data.
- Step 147 multi-pane chart foundation smokes still pass.
- Step 160 layout menu owner binding smokes still pass.

## Next Direction

Step 162 should bootstrap data and viewport state for newly visible layout pane
hosts through existing pane-local owners. It should not add cross-pane sync,
simulated trading, overlays, or comparison symbols.
