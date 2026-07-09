# V6 Step 200 - Reset View HTF Projection Audit

## Purpose

Step 200 verifies that reset view uses pane-local display chart-data state for
higher timeframes.

Reset view is a viewport concern. It should restore a pane's default right-wall
intent and re-project that intent over the chart-data record already applied to
the chart surface.

## Current Runtime Shape

- `reset-view-control-bridge` reads pane-local chart surface state:
  - applied chart-data revision;
  - pane snapshot data length.
- It dispatches `CHART_VIEWPORT_COMMANDS.RESET_VIEW` with
  `latestLogicalIndex = dataLength - 1`.
- `chart-viewport-runtime` owns intent reset and logical range projection.
- `chart-data-projection-runtime` is not part of reset view; projected bars must
  already be in chart-data before reset is invoked.

## Decision

Do not route reset view through `CHART_DATA_PROJECTION_COMMANDS`.

Reset view must remain projection-owner agnostic. For HTF panes, correctness is
achieved because chart-data already contains display-timeframe bars from the
entry/reload/manual-next/leftward-history paths. Reset uses the display bar
count and revision, not raw source bars.

## Required Guards

- Reset view bridge must not reference bar-data, replay, chart-data projection,
  or chart engine aggregation logic.
- Browser smoke must prove a 5m pane reset uses the displayed HTF bar count as
  latest logical index.
- Reset must not mutate replay state, chart-data bars, or bar-data cache.
- Per-pane reset isolation must continue to pass.

## Non-Goals

- Do not add aggregation to chart engine.
- Do not request bars during reset.
- Do not change replay cursor or source timeframe ownership.
- Do not change reset button placement or pane action rail behavior.
