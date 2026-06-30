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

Status: complete.

Completed:

- Updated Phase 2 roadmap status to ready for Phase 3 after Step 374.
- Added Step 374 to Phase 2 delivered/related step lists.
- Preserved the manual viewport rule: auto-follow remains active until Phase 3
  defines real drag/zoom behavior.
- Updated Phase 3 status to ready to start.
- Fixed Step 373.1 TODO drift.

### Step 375.3 - Phase 3 Entry Checklist And Verification

- Record the Phase 3 first-step direction.
- Run full V5 smoke and `git diff --check`.
- Update this handoff with the result.

Status: complete.

Completed:

- Added Phase 3 entry checklist to `v5/docs/V5_PHASE_ROADMAP.md`.
- Set the first Phase 3 direction as chart interaction runtime contracts for
  true visible-range drag/zoom.
- Marked toolbar polish, order/journal overlays, rich drawings, and full
  settings templates as not first-entry work unless the roadmap is updated.
- Verified full V5 smoke and whitespace checks.

## Manual Acceptance

- Phase 2 status and gates are no longer stale after Step 374.
- Phase 3 entry starts from chart interaction contracts and boundaries.
- Manual viewport movement is not implemented in Step 375.
- No runtime code changes are included.

## Checks

- `node v5/scripts/smoke_all.js`
- `git diff --check`

Result: all checks passed.

## Follow-up SaaS Strategy Decision

After Phase 2 closeout, the product direction was clarified:

- V5 should remain SaaS-ready, not SaaS-heavy, during Phase 3 and Phase 4.
- The SaaS-worthy value is the trading training loop: replay plus simulated
  orders, journal, analytics, and durable practice history.
- Replay alone is not enough differentiation to justify early auth, billing, or
  production multi-tenant infrastructure.
- Phase 3 remains chart interaction runtime work.
- Phase 4 should validate order/journal training value with server-ready models.
- Phase 6 is the earliest phase for public auth, billing, entitlement, hosted
  persistence, and multi-user maturity.

Updated documents:

- `v5/docs/specs/saas-readiness-strategy.md`
- `v5/docs/specs/README.md`
- `v5/docs/V5_PHASE_ROADMAP.md`
- `v5/docs/MVP_ARCHITECTURE.md`
- `v5/docs/EXECUTION_FRAMEWORK.md`
- `v5/TODO.md`
