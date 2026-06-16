# 2026-06-16 Architecture Review Fix Plan

## Context

`v4/docs/user/v4-architecture-review.md` was added as a V4 architecture review report. The report is broadly accurate, but the response should prioritize small correctness and safety fixes over large refactors.

Current confirmed findings:

- `/v4/price` ignores the requested instrument and silently falls back to NQ.
- Frontend `fetchPrice()` also does not pass the current Main instrument.
- Data Maintenance POST actions are localhost-only and guarded by action allowlists / confirmation strings, but still lack a request-level CSRF/header guard.
- Daily bar maintenance-window filtering and Daily Regime CSV generation express the same 17:00-18:00 exclusion in different ways; this should be verified before changing behavior.
- SMT records are included in history snapshots and Review JSON, but do not have dedicated localStorage persistence like PDA/Segment/Order Setup/Live Record.
- Large-file and persistence-factory refactors are real maintainability work, but should not interrupt the current data-entry stabilization phase.

## Step 292: Architecture Review Fix Pack

Goal: address the highest-value architecture review findings with small, verifiable changes while keeping current Live Record / Data Maintenance workflows stable.

Non-goals:

- No broad module reorganization.
- No `inspector-sidebar.js` or `review-archive.js` split in this step.
- No generic persistence factory in this step.
- No SMT workflow redesign unless the audit shows a concrete data-loss bug that affects current usage.

### Step 292.1: Track architecture review report

- Add `v4/docs/user/v4-architecture-review.md` to the repository.
- Link it from `v4/docs/README.md` under Planning And Reviews.
- Record this fix plan in TODO/session.

Acceptance:

- The report is tracked.
- Documentation index exposes it.
- No runtime code changes yet.

### Step 292.2: Fix `/v4/price` instrument scope

- Update backend `_handle_price` to read `instrument`, defaulting to `NQ` for backward compatibility.
- Pass the instrument into `query_price`.
- Update frontend `fetchPrice()` to accept/pass an instrument.
- Update all frontend callers to pass current Main instrument.
- Add focused API/JS smoke coverage proving ES price requests return ES and NQ price requests return NQ for the same timestamp when both exist.

Acceptance:

- `/v4/price?instrument=ES&timestamp=...` returns `"instrument": "ES"`.
- Existing callers still work if no instrument is supplied.
- Main=ES hover/lookup paths no longer silently read NQ.

### Step 292.3: Verify maintenance-window filtering consistency

- Add a read-only verification script or test that compares the daily aggregation path used by `/v4/daily_bars` with `generate_daily_regime_csv.py` for selected NQ/ES windows.
- Include normal days and DST boundary windows if data is available.
- Only change aggregation logic if the verification finds a real mismatch.

Acceptance:

- Verification result is documented in the session.
- If equivalent, leave code unchanged and record why.
- If mismatched, fix the smaller path and add regression coverage.

### Step 292.4: Add Data Maintenance request guard

- Add a minimal request-level guard for `/v4/data_maintenance/run`.
- Preferred approach: require a custom header from `data-maintenance.html`, while still binding only to localhost.
- Keep existing action allowlist, confirmation strings, mutex, and friendly output behavior.
- Avoid adding login/auth complexity.

Acceptance:

- Browser UI still works.
- Direct POST without the expected guard is rejected.
- `OPTIONS` CORS headers remain compatible with the local page.

### Step 292.5: Decide SMT persistence status

- Audit current SMT lifecycle: creation, display, history undo/redo, Review JSON export/import, calendar visibility.
- Decide one of:
  - document SMT as review-archive/history-scoped only; or
  - add dedicated instrument-scoped localStorage persistence if current workflow expects refresh survival.
- Do not change SMT UX beyond what the decision requires.

Acceptance:

- TODO/session records the decision.
- If persistence is added, include smoke coverage for refresh restore and instrument isolation.
- If deferred, user docs or architecture notes explicitly say SMT is not dedicated-localStorage persisted.

### Step 292.6: Regression run and closeout

- Run targeted tests for price lookup, Data Maintenance guard, and any SMT/maintenance-window changes.
- Run `git diff --check`.
- Update TODO/session with final results and residual deferred architecture work.

Acceptance:

- Worktree is clean after commit.
- Architecture review report remains tracked.
- Deferred P3 refactors are explicitly listed but not mixed into this fix pack.

## Recommended Execution Order

1. 292.1 documentation tracking.
2. 292.2 `/v4/price` instrument bug.
3. 292.3 maintenance-window verification.
4. 292.4 Data Maintenance request guard.
5. 292.5 SMT persistence decision.
6. 292.6 regression and closeout.

## Deferred Architecture Work

- Unify duplicated domain persistence helpers after data-entry workflow stabilizes.
- Split large UI/action modules when touching those areas for feature work.
- Normalize old `v4.dateRangeHistory` / `v4.replayHistory` storage keys if cross-instrument history becomes a real workflow problem.
- Consider documented display-read-path float usage instead of Decimal conversion in JSON read paths.
