# Step 410 - Settings Canvas Direct Chart Options

Status: implemented; automated acceptance passed; human visual acceptance is
pending.

## Scope

Step 410 activates only the direct Lightweight Charts options selected by the
Step 409.5 catalog:

- background color;
- one grid visibility switch and one shared grid color;
- crosshair color;
- price/time-scale text color and font size;
- price/time-axis border color.

Navigation visibility, top/bottom/right margins, day separators, Symbol,
Status line, Scales/lines, timezone, and 12/24-hour presentation remain outside
this step.

## Ownership

- Settings model owns normalized six-digit hex colors, a bounded `10..20`
  scale-font size, schema version `2`, and v1 migration.
- Settings panel owns only draft fields and the existing OK/Cancel/Reset
  transaction.
- `settings-chart-surface-bridge` whitelists Canvas fields.
- `canvas-settings-options` is a pure mapping from committed preferences to
  official chart options.
- Workstation Chart Surface remains the only owner that calls `applyOptions`;
  every mounted pane is updated through the Chart Host Manager.

No Settings module imports Lightweight Charts or writes chart series,
viewport intent, replay state, or browser storage.

## Acceptance Evidence

- model smoke covers defaults, validation, schema v2, and v1 migration;
- mapping smoke covers layout, grid, crosshair, price scale, and time scale;
- bridge/surface/boundary smokes preserve owner routing;
- browser acceptance proves every new value is draft-only before OK, applies
  atomically after OK, persists as v2, and restores after hard reload;
- existing Step 409 Cancel/Reset/persistence and workflow browser regressions
  remain green;
- `git diff --check` passes.

## Human Visual Matrix

1. Open Settings and change background, grid color, crosshair, text, font size,
   and axis-line color; chart appearance must not change before OK.
2. Cancel and reopen; every control and the chart must show committed values.
3. Commit visibly distinct values; all chart panes must update together without
   K-line, replay cursor, timeframe, or viewport movement.
4. Hard refresh; values and chart appearance must be restored.
5. Reset then Cancel; the committed customized appearance must remain.

## Next

After human visual acceptance, Step 411 implements Canvas navigation visibility,
top/bottom scale margins, and right-margin bars. Right-margin bars must travel
through Chart Viewport Intent rather than becoming adapter-owned durable range
state.
