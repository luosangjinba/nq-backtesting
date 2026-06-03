# 2026-06-02 - P0 Order Setup Refactor

## Context

An external AI review proposed a broad P0 refactor covering Order Setup actions, adapter convergence, and persistence unification. After review against the current V4 codebase, the executable P0 scope was narrowed to the Order Setup action layer and a light active bridge cleanup.

The old AI review draft is archived at `v4/docs/legacy/P0_REFACTOR_PLAN_legacy_ai_review.md`. The executable checklist is `v4/TODO.md` Phase 15.

## Executed Steps

- Step 239: Added `v4/tests/order-setup-smoke.js` as a baseline covering setup create/update, active setup, refs, localStorage restore, and undo/redo.
- Step 240: Extracted stateless helpers to `ui/inspector/order-review-utils.js`.
- Step 241: Extracted refs/reasons behavior to `ui/inspector/order-review-reason-actions.js`.
- Step 242: Extracted create/lifecycle behavior to `ui/inspector/order-review-lifecycle-actions.js`.
- Step 243: Extracted edit/result/exit-pick behavior to `ui/inspector/order-review-edit-actions.js`.
- Step 244: Kept `ui/inspector/order-review-actions.js` as the stable facade for `inspector-sidebar.js`.
- Step 245: Tightened `order-review-active.js` so internal active operations return Setup Set objects from `setup-set.js`; legacy `ActiveOrderReview` aliases remain compatible.
- Step 246: Documented the current Order Setup layer boundary in `docs/ORDER_REVIEW_DESIGN.md`.
- Step 247: Completed P0 verification and marked the TODO plan complete.

## Current Layer Boundary

- Store layer: `order-review-store.js` owns the compatible persisted `orderReviews` data shape.
- View-model layer: `setup-set.js` is the runtime authority for chart/Inspector/Calendar derived state.
- Active bridge: `order-review-active.js` owns only the active setup id and returns Setup Set objects.
- Inspector action facade: `order-review-actions.js` composes focused action modules and preserves the controller factory API.
- Focused action modules: utils, refs/reasons, lifecycle, edit/result.

Persistence manager unification and deeper store/setup-set schema changes remain deferred.

## Verification

- `node v4/tests/order-setup-smoke.js`
- Full `node --check` across `v4/src/**/*.js` and `v4/tests/**/*.js`
- `git diff --check`
- Web smoke: `http://127.0.0.1:8001/index.html` returned HTTP 200.
- API smoke: `/v4/health`, `/v4/bars`, and `/v4/economic_events` returned valid responses on port 8766.
