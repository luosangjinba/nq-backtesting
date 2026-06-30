# Step 376 - V5 Chart Interaction Runtime Contracts

## Goal

Start Phase 3 by defining and implementing chart-owned interaction contracts for
manual visible-range movement.

This step must preserve the V5 ownership model:

- chart runtime owns manual visible range and rendered visible bars;
- replay runtime owns cursor/reveal state and `displayBars`;
- bar data runtime owns `/v4/bars` requests and cache;
- UI dispatches commands and subscribes to events.

## Planned Steps

### Step 376.1 - Spec And Plan

- Add `v5/docs/specs/chart-interaction-contracts.md`.
- Update specs index.
- Add Step 376 to `v5/TODO.md`.
- Create this session handoff.

Status: complete.

### Step 376.2 - Chart Runtime Interaction Contract

- Add chart commands for manual visible range, resume follow, and interaction
  state readback.
- Track chart-owned follow/manual state.
- Render from manual visible range when follow is paused.
- Add chart interaction smoke coverage.

Status: complete.

Completed:

- Added chart interaction commands:
  - `chart.setManualVisibleRange`
  - `chart.resumeViewportFollow`
  - `chart.getInteractionState`
- Chart runtime now tracks follow/manual interaction mode.
- Manual visible range disables viewport follow and renders the manual range.
- Replay-style follow sync updates cursor/capacity but does not auto-resume
  follow while manual mode is active.
- Explicit resume returns rendering to cursor-follow behavior.
- Added `v5/tests/chart-interaction-contracts-smoke.js`.
- Added the chart interaction smoke to `v5/scripts/smoke_all.js`.

### Step 376.3 - Replay And Follow Behavior

- Ensure replay cursor movement does not resume follow after manual movement.
- Ensure explicit resume returns to cursor-follow rendering.
- Add replay smoke coverage for cursor/displayBars invariants.

Status: complete.

Completed:

- Added replay/chart integration smoke for manual viewport follow behavior.
- Verified manual visible-range movement does not directly mutate replay cursor or
  `displayBars`.
- Verified Next can advance replay while chart remains in manual mode.
- Verified replay follow sync does not auto-resume chart follow after manual
  movement.
- Verified explicit `chart.resumeViewportFollow` restores cursor-follow
  rendering.
- Added `v5/tests/replay-manual-viewport-follow-smoke.js`.
- Added the replay/manual follow smoke to `v5/scripts/smoke_all.js`.

### Step 376.4 - Browser Coverage And Handoff

- Add browser smoke proving manual range pauses follow and resume restores it.
- Run full V5 smoke and `git diff --check`.
- Update this session handoff.

Status: complete.

Completed:

- Added `v5/tests/chart-interaction-browser-smoke.js`.
- Browser smoke proves manual visible range pauses follow in the real route.
- Browser smoke proves Next advances replay cursor while chart remains in manual
  mode.
- Browser smoke proves explicit resume returns chart rendering to cursor-follow
  mode.
- Updated the spec/TODO language to clarify direct mutation boundaries:
  viewport demand consumption may grow replay-owned `displayBars`, but chart
  manual movement does not directly mutate replay state or request bars.
- Added the browser smoke to `v5/scripts/smoke_all.js`.
- Ran full V5 smoke and whitespace checks.

## Manual Acceptance

- Manual visible-range movement pauses auto-follow.
- Next/Play after manual movement does not auto-resume follow.
- Resume follow is explicit.
- Manual movement does not request bars directly.
- Manual movement does not directly mutate replay cursor or `displayBars`.
- Replay-owned viewport demand consumption may grow `displayBars`.
- Full pointer drag/zoom, crosshair, go-to time, order/journal, auth, billing,
  and SaaS infrastructure are out of scope.

## Checks

- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/replay-manual-viewport-follow-smoke.js`
- `node v5/tests/chart-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

Result: all checks passed.

## Review Follow-Up

Accepted audit fix:

- `chart.setRightEdgeLimit` now clamps `interaction.manualVisibleRange` together
  with `visibleRange` when manual mode is active.
- Right-edge limit changes now recompute viewport/prefix demand and rerender
  mounted chart hosts.
- Added smoke coverage proving manual readback and rendered bars stay aligned
  after the replay right edge moves left.
