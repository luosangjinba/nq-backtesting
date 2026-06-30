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

Status: pending.

### Step 376.3 - Replay And Follow Behavior

- Ensure replay cursor movement does not resume follow after manual movement.
- Ensure explicit resume returns to cursor-follow rendering.
- Add replay smoke coverage for cursor/displayBars invariants.

Status: pending.

### Step 376.4 - Browser Coverage And Handoff

- Add browser smoke proving manual range pauses follow and resume restores it.
- Run full V5 smoke and `git diff --check`.
- Update this session handoff.

Status: pending.

## Manual Acceptance

- Manual visible-range movement pauses auto-follow.
- Next/Play after manual movement does not auto-resume follow.
- Resume follow is explicit.
- Manual movement does not request bars directly.
- Manual movement does not mutate replay cursor or `displayBars`.
- Full pointer drag/zoom, crosshair, go-to time, order/journal, auth, billing,
  and SaaS infrastructure are out of scope.

## Checks

- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/replay-manual-viewport-follow-smoke.js`
- `node v5/tests/chart-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`
