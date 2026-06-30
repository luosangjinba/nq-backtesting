# Step 374 - V5 Replay Viewport Follow And Rolling Window

## Goal

Close the Phase 2 viewport/display gate by making chart rendering follow the
replay cursor instead of anchoring all revealed bars to the left edge.

The key separation is:

- `displayBars`: replay-owned revealed history;
- `visibleBars`: chart-owned rendered subset.

## Planned Steps

### Step 374.1 - Spec And Plan

- Add `v5/docs/specs/fx-replay-viewport-follow.md`.
- Update specs index.
- Add Step 374 to `v5/TODO.md`.
- Create this session handoff.

Status: complete.

### Step 374.2 - Chart Runtime Follow Contract

- Add chart runtime command/state for viewport follow.
- Render a rolling visible subset while retaining full bars state.
- Add chart runtime smoke coverage.

Status: complete.

Completed:

- Added chart viewport follow commands.
- Chart runtime now keeps full bar state while rendering a follow-derived
  visible subset when follow is enabled.
- Added rendered/full bar count metadata to the chart DOM surface for browser
  verification.
- Added `v5/tests/chart-viewport-follow-smoke.js`.
- Added the chart viewport follow smoke to `v5/scripts/smoke_all.js`.

### Step 374.3 - Replay Runtime Follow Sync

- Sync chart follow after initial load, Next/Play, Reset, and display
  projection.
- Preserve cursor/displayBars/no-future behavior.
- Add replay runtime smoke coverage.

Status: complete.

Completed:

- Replay runtime now renders display bars through a helper that also syncs chart
  viewport follow state.
- Viewport follow sync runs after initial load, display window/projection
  reloads, prefix merge/release rerenders, Next/Play progression, and Reset.
- Added `v5/tests/replay-viewport-follow-smoke.js`.
- Added the replay viewport follow smoke to `v5/scripts/smoke_all.js`.

### Step 374.4 - Browser Coverage And Verification

- Add browser smoke for visible rolling behavior.
- Verify no extra `/v4/bars` requests from follow updates.
- Run full smoke and update this handoff.

Status: complete.

Completed:

- Added `v5/tests/replay-viewport-follow-browser-smoke.js` to prove the chart
  renders a rolling visible window while replay-owned `displayBars` continues to
  grow.
- Verified viewport follow does not add bars requests; Next may use cache or
  request the normal forward window, but follow sync itself is chart-only.
- Synced chart viewport follow `rightOffsetBars` with chart presentation
  settings so display controls and follow rendering share the same offset.
- Updated older smoke assertions to distinguish rendered chart count from full
  chart/display count after the Step 374 contract change.
- Added the browser viewport follow smoke to `v5/scripts/smoke_all.js`.

## Manual Acceptance

- `displayBars` remains replay-owned revealed history.
- Chart runtime owns rendered `visibleBars`.
- Next/Play keep the cursor near the right side with `rightOffsetBars`.
- Older bars roll out of the rendered chart when revealed bars exceed visible
  capacity.
- Viewport follow does not request bars, mutate replay cursor, or mutate
  `displayBars`.
- Manual drag/zoom behavior remains out of scope until Phase 3.

## Checks

- `node v5/tests/chart-viewport-follow-smoke.js`
- `node v5/tests/replay-viewport-follow-smoke.js`
- `node v5/tests/replay-viewport-follow-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

Result: all checks passed.
