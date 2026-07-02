# Step 470-472 - V5 Layout Variant And Host Plan

Date: 2026-07-02

Status: planned.

## Goal

Continue Layout work without mixing UI variants, pane shell geometry, and real
chart host lifecycle into one large step.

## Step 470 - Layout Variant State

Add explicit layout variant state.

- Supported variants:
  `single.default`, `twice.vertical`, `twice.horizontal`, `triple.vertical`,
  `triple.horizontal`, `triple.left`, `triple.right`, `triple.top`, and
  `triple.bottom`.
- Keep `mode` as the bounded pane-count category.
- Make icon clicks dispatch exact variants.
- Add runtime smoke coverage for variant normalization and invalid variants.
- Keep only one real primary chart host.

## Step 471 - Variant Pane Shell Layout

Make the pane shell visually match each variant.

- Add pane shell data attributes for layout variant.
- Add CSS grid layouts for all supported variants.
- Preserve stable pane ids and active-pane selection.
- Keep secondary/tertiary panes as placeholders.
- Add browser smoke coverage for geometry and host count.

## Step 472 - Real Multi-Pane Chart Hosts

Turn placeholder panes into real chart hosts through chart runtime.

- Define the initial secondary-pane data policy: same replay session, same
  instrument, pane-level display timeframe, and no bars beyond the shared replay
  cursor.
- Render secondary/tertiary `data-chart-host` elements only when layout state
  requires them.
- Mount hosts through `chart.mountHost`.
- Keep chart series writes in chart runtime.
- Keep bar requests in bar-data runtime.
- Keep replay cursor and reveal state in replay runtime.
- Add host-count, adapter lifecycle, sync, no-future, and boundary smokes.

## Boundary Notes

- Route UI dispatches commands and subscribes to events only.
- Layout runtime owns mode, variant, pane list, active pane, and sync flags.
- Chart runtime owns host/adapters, chart writes, visible ranges, and viewport
  metrics per pane.
- Replay runtime owns the shared replay cursor and reveal state.
- Bar-data runtime owns all bar requests/cache windows.

## Next Action

Execute Step 470 first. Do not create real secondary/tertiary chart hosts until
Step 472.
