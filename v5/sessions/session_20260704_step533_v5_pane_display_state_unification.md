# Step 533 - V5 Pane Display State Unification

Date: 2026-07-04

## Goal

Fix the remaining multi-pane display corruption class by replacing the split
primary-vs-secondary chart display-state model with one pane-local display-state
path and stale-write guards.

## Trigger

Manual testing after Step 532 still shows this class of bug:

- left pane active, changed to `1H`;
- repeated drag/wheel interactions can make the right pane become `1H`;
- the right pane can blank until reset view;
- after reset, panes can show inconsistent latest anchors.

## Detailed Plan

1. Step 533.1 - Plan and documentation.
   - Add `v5/docs/specs/pane-display-state-unification-plan.md`.
   - Update `v5/TODO.md`, docs/spec indexes, and this handoff.
   - Commit docs.

2. Step 533.2 - Continuous interaction smoke.
   - Add a browser smoke that reproduces/guards left `1H` and right `1m`
     repeated drag/wheel/reset interactions with interval sync off.
   - Commit the harness before implementation.

3. Step 533.3 - Unified chart pane state helpers.
   - Refactor chart runtime state helpers so primary and non-primary panes
     resolve through one pane state model.
   - Stop missing panes from borrowing another pane's live bars or TF.
   - Commit the runtime change.

4. Step 533.4 - Pane display revision guards.
   - Add pane-local display revision/generation where display context changes.
   - Carry/validate the revision for display-window and viewport-demand writes
     where necessary.
   - Commit the stale-write guard.

5. Step 533.5 - Route/controller fallback cleanup.
   - Reduce route-level display-timeframe fallback leakage.
   - Ensure refresh/control rendering reads active/target pane state.
   - Commit cleanup.

6. Step 533.6 - Regression and closeout.
   - Run focused multi-pane and replay regression gates.
   - Update TODO/spec/session with final result.
   - Commit closeout docs.

## Working Notes

- Lightweight Charts remains behind the existing chart runtime/adapter
  boundary.
- Chart runtime remains the only chart writer.
- Replay runtime remains the cursor/no-future owner.
- Bar-data runtime remains the only requester/cache owner.
