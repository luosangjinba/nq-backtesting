# V7 Acceptance Capability-Aware Status — R12.8

Status: implemented and included in the accepted V7.0.0 foundation milestone

## Trigger

The second acceptance pass proved that Sessions and Replay worked on the
existing-database cloud host, while `data-acquisition.html` still showed two
false failures:

- `Import service unavailable` with a non-JSON HTTP 404 even though the active
  DuckDB and Market Data service were healthy;
- `Maintenance API returned non-JSON HTTP 403` even though optional historical
  maintenance was intentionally disabled by the standalone read-only profile.

The browser pass also found a separate presentation leak: a Replay update could
show the internal code `provider-unavailable` directly to the user.

## Decision

Database readiness, first-run import authority, and optional maintenance
authority are three independent capabilities. A missing write capability must
not make a healthy read capability appear unavailable.

For an existing-database deployment:

1. the importer continues running loopback-only with importing disabled;
2. only `GET /v7/database/health` is reachable through the application origin;
3. upload, prepare, discard, status, and activation routes remain absent;
4. the Database Setup panel uses health to show `Database active` and keeps all
   upload/replacement controls locked;
5. if optional maintenance is unavailable, Data Acquisition reads
   `/v7/market-data/health` and `/v7/market-data/available-dates` and presents
   `Read-only data ready` plus ES/NQ first/latest timestamps and market-date
   counts;
6. maintenance-only Contract Roll, selected-range writes, and activity sections
   are hidden. The fallback does not claim duplicate/integrity evidence that
   only a maintenance owner can calculate.

A red `Market data unavailable` state is reserved for failure of the active
Market Data read boundary itself. Internal Replay error codes are translated by
the Replay Workspace UI adapter; unknown code-shaped values receive safe
generic copy, while already user-facing explanations remain unchanged.

## Ownership

- `adapter.database-bootstrap-ui` owns bootstrap health parsing and locked
  first-run controls;
- `adapter.data-acquisition-ui` owns the capability-aware coverage controller
  and its read-only Market Data client;
- `adapter.replay-workspace-ui` owns internal-code-to-user-copy translation;
- `deployment.linux` owns the exact health-only Caddy/Node proxy composition;
- `service.v7-database-import` retains all staging and activation write
  authority; `service.v7-market-data` remains read-only.

The Data Acquisition surface entry remains orchestration-only: coverage state
and fallback rendering live in `coverage-status-controller.js`. No UI module
receives DuckDB, Replay, Chart, Session, or cache write authority.

## Security And Failure Contract

Port 8768 remains loopback-only. Public existing-database profiles expose one
exact health path; their global mutation guard still returns 403 for POST, PUT,
PATCH, and DELETE. Local/private Web uses `health-only` proxy mode. Bootstrap
profiles retain the authenticated full importer proxy only while the target is
absent and bootstrap is explicitly enabled.

An old release can still show the former 404/403 copy after source is pulled;
the host must be redeployed so the immutable Web release, environment, and
Caddy fragment change together.

## Automated Evidence

- `tests/data-acquisition-ui-harness.js` binds the read-only Market Data
  coverage contract and HTTPS/local endpoint selection;
- `tests/data-acquisition-ui-browser-harness.js` uses real Chrome to prove an
  active database, disabled maintenance, blue read-only status, ES/NQ coverage,
  hidden write sections, locked importer, and absence of raw HTTP 403 copy; its
  1440x900 state is frozen as `read-only-deployment-1440x900.png`;
- `tests/database-bootstrap-ui-harness.js` proves non-JSON HTTP failures retain
  status/code instead of collapsing into an unclassifiable error;
- `tests/database-import-ui-browser-harness.js` binds full versus health-only
  proxy route ownership;
- `tests/linux-deployment-script-harness.js` proves exact public health routing,
  full bootstrap routing, and local health-only mode;
- `tests/replay-workspace-ui-independent-harness.js` proves known and unknown
  internal error codes cannot leak through the public Replay UI contract;
- Production Architecture, Source Quality, Deployed Runtime Architecture, and
  Standalone Runtime remain binding gates.

## Non-Blocking Operational Verification

Redeploy one existing-database cloud host, hard-refresh
`/v7/app/data-acquisition.html`, and confirm:

- `Database active` and `Read-only data ready` are visible;
- ES and NQ first/latest range cards load;
- no `Import service unavailable`, raw HTTP 403/404, Upload authority, Contract
  Roll, or selected-range write control is presented;
- `/v7/app/` still loads the same Sessions and Replay data.

This focused rerun remains useful deployment evidence, but the 2026-08-07
milestone decision classifies it as non-blocking. The user accepted the second
round apart from this defect, the correction is covered by automated browser,
deployment, and architecture evidence, and V7.0.0 does not claim that every
cloud/provider permutation has been physically exercised. Separate clean-host
bootstrap and multi-mode deployment checks remain operational follow-ups.
