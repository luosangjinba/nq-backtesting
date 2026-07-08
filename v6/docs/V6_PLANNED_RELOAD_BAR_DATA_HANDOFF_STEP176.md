# V6 Planned Reload Bar-Data Handoff - Step 176

Date: 2026-07-08

## Boundary

Step 176 adds the narrow handoff that consumes replay-safe reload window plans
through the bar-data owner.

The runtime listens to `paneIntentReloadPlan:planned`, calls
`BAR_DATA_COMMANDS.LOAD_WINDOW` for each planned window, stores loaded metadata,
and emits `paneIntentReloadData:loaded`.

## Ownership

- `pane-intent-reload-window-runtime` owns planning only.
- `pane-intent-reload-data-runtime` owns the handoff from planned reload windows
  to the bar-data owner.
- Bar-data runtime remains the only owner that requests, normalizes, and caches
  bars.
- Chart-data runtime is not called in this step.
- Chart-viewport runtime is not called in this step.
- Chart engine is not touched in this step.

## Contract

New contract surface:

- `paneIntentReloadData.getState`
- `paneIntentReloadData:loaded`

The loaded event payload keeps the pane metadata and original replay-safe
planned window, plus loaded-window metadata from bar-data. It does not publish
raw bars to chart-data.

## Non-Goals

This step does not:

- call chart-data replace/append/prepend commands;
- call chart-viewport projection commands;
- write chart series;
- mutate replay cursor or reveal state;
- introduce symbol/interval UI behavior beyond the existing reload pipeline.

## Verification

- `node v6/tests/pane-intent-reload-data-runtime-step176-smoke.js`
- `node v6/tests/pane-intent-reload-window-runtime-step175-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 177 should define how loaded reload data replaces pane-local chart-data
under replay no-future constraints. Viewport projection should remain separate
unless explicitly accepted in that step.
