# Step 384 - V5 Chart Navigation Toolbar

## Goal

Add a compact chart navigation toolbar so users can zoom, scroll, and reset to
the replay cursor without breaking no-future replay boundaries or runtime
ownership.

This step advances Historical Replay Review: chart navigation needs visible,
ergonomic controls before the replay workstation can feel usable.

## Planned Steps

### Step 384.1 - Plan

- Add Step 384 to `v5/TODO.md`.
- Update chart interaction specs with toolbar zoom/pan/reset rules.
- Create this session handoff.

Completed:

- Added Step 384 to `v5/TODO.md`.
- Updated chart interaction specs with toolbar zoom/pan/reset rules.
- Created this session handoff.

Status: complete.

### Step 384.2 - Chart Runtime Navigation Commands

- Add chart runtime commands for visible-range zoom and pan.
- Keep span math, right-edge clamping, manual mode, and viewport demand inside
  chart runtime.
- Do not request bars from chart runtime.

Completed:

- Added `chart.zoomVisibleRange`.
- Added `chart.panVisibleRange`.
- Kept span math, right-edge clamping, manual mode, and viewport demand inside
  chart runtime.

Status: complete.

### Step 384.3 - Route Toolbar

- Add a bottom chart navigation toolbar with zoom out, zoom in, pan left, pan
  right, and reset/follow cursor controls.
- Dispatch chart commands only from UI.
- Keep replay cursor, display bars, and bar cache owned by their runtimes.

Completed:

- Added bottom chart toolbar controls for zoom out, zoom in, pan left, pan
  right, and reset-to-cursor.
- UI dispatches chart commands only.
- Reset-to-cursor uses explicit chart viewport follow resume.

Status: complete.

### Step 384.4 - Boundary Preservation

- Preserve viewport demand emission after pan/zoom.
- Ensure pan right remains clamped to the replay right-edge limit.
- Ensure reset resumes follow explicitly through chart runtime.

Completed:

- Pan/zoom reuse chart runtime manual visible-range handling and viewport
  demand emission.
- Pan right remains clamped to the replay right-edge limit.
- Pan/zoom do not request bars or mutate replay state.

Status: complete.

### Step 384.5 - Verification And Closeout

- Add or update runtime/browser smoke coverage.
- Run relevant checks, full V5 smoke, and `git diff --check`.
- Update TODO and this handoff.
- Commit.

Completed:

- Extended `chart-interaction-contracts-smoke.js`.
- Added `chart-navigation-toolbar-browser-smoke.js`.
- Added the new browser smoke to `v5/scripts/smoke_all.js`.
- Ran relevant checks, full V5 smoke, and `git diff --check`.

Status: complete.

## Manual Acceptance

- The chart shows compact controls for zoom out, zoom in, pan left, pan right,
  and reset/follow cursor.
- Zoom and pan pause viewport follow and update chart-owned manual visible
  range.
- Pan right remains clamped to the replay right-edge limit and cannot reveal
  unrevealed future bars.
- Pan left may emit viewport demand, but bars are loaded only through replay and
  bar-data runtimes.
- Reset resumes viewport follow through the chart runtime and does not advance
  replay cursor.
- UI does not slice `displayBars`, request bars, mutate replay state, or import
  chart internals.
- Order, journal, dashboard, AI, SaaS auth, billing, and full settings
  templates remain out of scope.

## Checks

- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/replay-manual-viewport-follow-smoke.js`
- `node v5/tests/chart-engine-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

Result: all checks passed.

## Handoff Notes

- Step 384 is complete.
- Navigation toolbar work is chart-owned and preserves replay no-future
  boundaries.
- Recommended next step: Step 385 should consolidate replay toolbar layout and
  interaction-control ergonomics before order, journal, dashboard, AI, or SaaS
  work.
