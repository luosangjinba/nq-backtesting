# Step 375 - V5 Phase 2 Closeout And Phase 3 Entry Plan

## Goal

Close Phase 2 deliberately after Step 374, fix documentation drift, and define
the first Phase 3 direction before implementing more chart UI.

This step is documentation and governance only. It must not change runtime code.

## Planned Steps

### Step 375.1 - TODO And Session Plan

- Add Step 375 to `v5/TODO.md`.
- Create this session handoff.

Status: complete.

### Step 375.2 - Phase 2 Roadmap Closeout

- Update `v5/docs/V5_PHASE_ROADMAP.md` so Phase 2 reflects Step 374 completion.
- Preserve the explicit rule that manual drag/zoom remains Phase 3 work.
- Fix the Step 373 TODO drift where the spec/session planning substep is still
  unchecked despite the completed spec/session work.

Status: pending.

### Step 375.3 - Phase 3 Entry Checklist And Verification

- Record the Phase 3 first-step direction.
- Run full V5 smoke and `git diff --check`.
- Update this handoff with the result.

Status: pending.

## Manual Acceptance

- Phase 2 status and gates are no longer stale after Step 374.
- Phase 3 entry starts from chart interaction contracts and boundaries.
- Manual viewport movement is not implemented in Step 375.
- No runtime code changes are included.

## Checks

- `node v5/scripts/smoke_all.js`
- `git diff --check`
