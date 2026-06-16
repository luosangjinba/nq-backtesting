# 2026-06-16 Fix Review Follow-up Plan

## Context

`v4/docs/user/v4-fix-review.md` reviews the fixes after the architecture and performance reports. Its most actionable finding is that the Step 292 Data Maintenance custom-header guard is not enough while CORS still allows any origin to preflight and send `X-V4-Maintenance-Request`.

Confirmed current state:

- `/v4/price` instrument bug is fixed.
- Data Maintenance POST now requires `X-V4-Maintenance-Request: data-maintenance`.
- `do_OPTIONS()` still returns `Access-Control-Allow-Origin: *` and allows the custom header for all origins.
- Step 293 intentionally produced performance baseline only; it should not be reinterpreted as a failed optimization step.

## Step 294: Data Maintenance Origin Guard Follow-up

Goal: close the remaining fetch/XHR CSRF gap for `/v4/data_maintenance/run` by adding an Origin whitelist and tighter CORS handling for the maintenance endpoint.

Non-goals:

- No Data Maintenance UI redesign.
- No login/auth system.
- No backend performance optimization in this step.
- No DB rewrite, connection pool, or renderer optimization in this step.

### Step 294.1: Track fix review report

- Add `v4/docs/user/v4-fix-review.md` to the repository.
- Link it from `v4/docs/README.md` as a pending follow-up review.
- Record this Step 294 plan in TODO/session.

Acceptance:

- Review is tracked and discoverable.
- TODO makes clear that the actionable item is Data Maintenance Origin/CORS, not performance work.

### Step 294.2: Define allowed maintenance origins

- Add a small whitelist for local static page origins.
- Required allowed origins:
  - `http://127.0.0.1:8001`
  - `http://localhost:8001`
- Consider allowing no `Origin` for direct CLI/curl/local non-browser requests only if needed.

Acceptance:

- Allowed origins are explicit and easy to audit.
- No wildcard origin is used for Data Maintenance write actions.

### Step 294.3: Enforce Origin on maintenance POST

- Update `/v4/data_maintenance/run` POST handling to require:
  - valid custom maintenance header;
  - allowed Origin when Origin is present.
- Reject untrusted browser origins before running any maintenance action.

Acceptance:

- Missing/wrong custom header still rejects.
- `Origin: http://evil.example` rejects.
- `Origin: http://127.0.0.1:8001` accepts if the custom header is valid.

### Step 294.4: Tighten CORS preflight for maintenance endpoint

- Update `do_OPTIONS()` behavior so preflight for `/v4/data_maintenance/run` only returns allow headers for allowed origins.
- Keep read-only GET endpoints compatible with the current local app.
- Do not grant `X-V4-Maintenance-Request` to wildcard origins.

Acceptance:

- Evil-origin preflight does not grant the maintenance custom header.
- Data Maintenance page still works from `127.0.0.1:8001`.

### Step 294.5: Focused tests

- Extend `v4/tests/test_architecture_review_fixes.py` or add a focused test file for:
  - valid maintenance header + allowed origin;
  - valid maintenance header + evil origin;
  - missing header + allowed origin;
  - CORS helper behavior for allowed and disallowed origins.

Acceptance:

- Tests do not need to bind a socket.
- Tests are deterministic and network-free.

### Step 294.6: Closeout

- Mark `v4-fix-review.md` as archived/handled after the Origin guard is implemented.
- Update TODO/session with verification commands.
- Run focused tests and `git diff --check`.

Acceptance:

- Worktree is clean after commit.
- Fix review no longer looks like an active open checklist.

## Deferred Items From Fix Review

- Backend connection reuse remains a later optimization candidate, but Step 293 measured frontend selection/render as the more visible bottleneck.
- DuckDB physical reorder remains deferred because Step 293 found the current table is not obviously physically chaotic.
- Full DST-wide maintenance-window proof can be added later if Daily Regime mismatch appears.
- Generic 500 error message cleanup is reasonable hardening, but lower priority than Origin guard.

## Implementation Notes

### Step 294.2 Complete - Allowed Origins

- Added explicit `ALLOWED_MAINTENANCE_ORIGINS` in `v4_api.py`.
- Allowed browser origins:
  - `http://127.0.0.1:8001`
  - `http://localhost:8001`
- Requests with no `Origin` are allowed so local CLI/curl/non-browser maintenance probes remain possible, but they still require the custom maintenance header.

### Step 294.3 Complete - POST Origin Enforcement

- `/v4/data_maintenance/run` now requires:
  - `X-V4-Maintenance-Request: data-maintenance`
  - an allowed Origin when an Origin header is present.
- Evil browser origins are rejected before any maintenance action is parsed or run.
- Missing/wrong custom header still returns `403`.

### Step 294.4 Complete - Maintenance Preflight CORS

- `do_OPTIONS()` now treats `/v4/data_maintenance/run` separately.
- Maintenance preflight only echoes `Access-Control-Allow-Origin` and grants `X-V4-Maintenance-Request` for whitelisted origins.
- Other endpoints keep simple wildcard GET-compatible CORS behavior.
- Maintenance POST responses now echo only the whitelisted origin; no-Origin local calls do not receive a wildcard CORS header.

### Step 294.5 Complete - Focused Tests

- Extended `v4/tests/test_architecture_review_fixes.py`.
- Covered:
  - missing/wrong custom header;
  - allowed Origin;
  - evil Origin;
  - no-Origin local call behavior;
  - CORS origin echo helper behavior.

### Step 294.6 Verification

- `python3 -m unittest v4.tests.test_architecture_review_fixes`
- `python3 -m py_compile v4/v4_api.py v4/tests/test_architecture_review_fixes.py`

The fix review report was marked as archived/handled after this implementation.
