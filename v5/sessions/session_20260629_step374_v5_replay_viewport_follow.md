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

Status: pending.

### Step 374.4 - Browser Coverage And Verification

- Add browser smoke for visible rolling behavior.
- Verify no extra `/v4/bars` requests from follow updates.
- Run full smoke and update this handoff.

Status: pending.

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
