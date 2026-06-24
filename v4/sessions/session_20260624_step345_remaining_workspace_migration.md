# Step 345 - Remaining Workspace Migration and Multi-User Readiness

## Goal

Continue migrating user-private browser-local domains to the default-user server workspace while keeping localStorage and Review JSON fallback intact.

## Step 345.1 - Migrate Segments and Segment Groups

Status: complete.

Workspace domain:

```text
market-segments
```

Scope:

```text
instrument-scoped
```

Payload:

```json
{
  "version": 2,
  "savedAt": 1780000000000,
  "instrument": "NQ",
  "segments": [],
  "segmentGroups": []
}
```

Implemented:

- Added `market-segments` as an instrument-scoped workspace domain.
- Wrapped `segment-persistence.js` with localStorage-first, server best-effort sync.
- Preserved existing payload shape: `segments` plus `segmentGroups`.
- Preserved Composite Move group relationships through `childSegmentIds`.
- Preserved segment PDA response refs inside segment payloads.
- Existing Review JSON export/import remains unchanged.

Validation:

```bash
python3 v4/tests/workspace-api-smoke.py
node v4/tests/segment-persistence-smoke.js
```

## Step 345.2 - Migrate Order Setup and Live Records

Status: complete.

Workspace domains:

```text
order-reviews
live-records
```

Scope:

```text
instrument-scoped
```

Implemented:

- Added both domains to the workspace API allowlist.
- Wrapped `order-review-persistence.js` with localStorage-first, server best-effort sync.
- Wrapped `live-record-persistence.js` with localStorage-first, server best-effort sync.
- Preserved the `orderReviews` compatibility schema used by Setup Set adapters.
- Preserved Live Record import/export payload shape.
- Review JSON import/export remains unchanged.

Validation:

```bash
python3 v4/tests/workspace-api-smoke.py
node v4/tests/order-live-persistence-smoke.js
```

## Step 345.3 - Migrate Notes and Review Domains

Status: complete.

Workspace domains:

```text
chart-notes
daily-time-reviews
time-overlays
economic-event-notes
entry-context-catalog
```

Scope:

```text
chart-notes: instrument-scoped
daily-time-reviews: instrument-scoped
time-overlays: instrument-scoped
economic-event-notes: instrument-scoped
entry-context-catalog: workspace-scoped
```

Implemented:

- Added the five domains to the workspace API allowlist.
- Wrapped Chart Notes, Daily Time Reviews, Time Overlays, and Economic Event Notes persistence with localStorage-first, server best-effort sync.
- Wrapped Entry Context Catalog as a workspace-scoped document because the catalog is shared across instruments.
- Preserved existing localStorage keys and payload fields so Review JSON and existing browser data remain compatible.
- Fixed workspace client fetch fallback so browser calls without explicit `fetchImpl` use `globalThis.fetch`.

Validation:

```bash
node v4/tests/notes-review-domains-persistence-smoke.js
node v4/tests/order-live-persistence-smoke.js
node v4/tests/segment-persistence-smoke.js
python3 v4/tests/workspace-api-smoke.py
python3 -m py_compile v4/v4_api.py
```

## Step 345.4 - Migrate Preferences/History by Policy

Status: complete.

Policy doc:

```text
v4/docs/planning/workspace_state_sync_policy.md
```

Decision:

- Keep all migrated research/review domains server-backed with localStorage fallback.
- Keep `primary-instrument`, `display-mode`, replay history, date range history, comparison workspace, and pane labels device-local for now.
- Defer pane layout, custom pane names, and active pane defaults until the pane model is stable enough to avoid another schema churn.
- Treat new review objects as server-backed by default.
- Treat new histories/MRU lists as device-local by default.

## Step 345.5 - Add Import Batch Audit

Status: complete.

Workspace domain:

```text
import-batches
```

Scope:

```text
workspace-scoped
```

Implemented:

- Added `import-batches` to the workspace API allowlist.
- Added `src/import/import-batch-audit.js` with localStorage-first, server best-effort sync.
- Initialized import batch audit during app startup.
- Review JSON import records source type, source filename, imported object counts, skipped counts, and archive metadata after a successful import.
- Tradovate archive generation now carries source filename and import batch summary metadata in `payload.source`.
- Audit entries store metadata only; they do not store raw uploaded CSV/JSON contents.

Validation:

```bash
node v4/tests/import-batch-audit-smoke.js
node v4/tests/tradovate-import-ui-modules-smoke.js
python3 v4/tests/workspace-api-smoke.py
python3 -m py_compile v4/v4_api.py
```

## Step 345.6 - Multi-User Login Readiness Review

Status: complete.

Review doc:

```text
v4/docs/planning/multi_user_login_readiness_review.md
```

Conclusion:

- The project is ready to continue single-user server mode under `user_id=default`.
- The project is not ready to expose multiple real users.
- All migrated user-private domains now have a default-user workspace boundary.
- Real login is blocked by session identity, CSRF, admin-only Data Maintenance, per-user backup/restore, upload limits, and user/workspace administration.

## Step 345.7 - Security Hardening Gate

Status: complete.

Gate doc:

```text
v4/docs/deploy/SECURITY_HARDENING_GATE.md
```

Implemented:

- Documented current allowed deployment: trusted single-user LAN/VPN only.
- Documented current protections: maintenance header/origin checks, command allowlist, maintenance lock, workspace domain allowlist, default-user storage path.
- Documented required public/multi-user gates: HTTPS, auth/session identity, CSRF, admin-only Data Maintenance, upload limits, per-user path isolation, per-user backup/restore, audit log, non-wildcard CORS, rate limits, user-uploaded market data policy.
- Updated `SERVER_RUNTIME_HARDENING.md` to point at the gate and reflect current server-backed workspace state.

Validation:

```text
Docs-only closeout; no runtime validation needed.
```
