# Session — R12.2 Standalone V7 Runtime

Date: 2026-08-06
Status: implemented with automated evidence; upgraded/clean-host review open

## Finding And Decision

Lightweight-host acceptance proved that the V7 browser and Linux package still
started a V4 Python read service, exposed `/v4/*`, wrote V4 environment names,
and archived the complete repository. The external DuckDB was not the problem:
its `futures_1m` schema is a valid reusable data contract. The executable
runtime boundary was incorrectly version-coupled.

The user confirmed that V7 must be completely separated from earlier versions.
R12.2 therefore requires a release containing only `v7/` plus external
database/state paths. It provides no compatibility route or deployed legacy
service after successful installation.

## Implemented Boundaries

- `service.v7-market-data` owns the new loopback Python entry, read-only DuckDB
  queries, dataset revision, and `/v7/market-data/*` HTTP contract;
- `adapter.market-data-provider` replaces the versioned browser adapter while
  preserving Bar Data, Projection, Replay, Workspace, Chart, Session, and
  Viewport ownership;
- `replay-lab-market-data.service` replaces the deployed API unit, Caddy
  exposes the V7 route only, and runtime configuration uses
  `V7_MARKET_DATA_*`;
- immutable deploy archives are scoped to `v7/`; the DuckDB, state SQLite,
  staging, secrets, and optional calendar remain external;
- an old `replay-lab-api.service` is captured, retired, and restored only
  inside the host transaction so upgrade failure can return to the previously
  healthy release;
- Database Bootstrap targets `V7_MARKET_DATA_DB`; the historical
  Databento/Contract Roll writer is explicitly disabled instead of being
  hidden behind a V4 API dependency.

## Evidence

- the V7 market-data Harness creates a temporary DuckDB, starts only
  `v7/server`, proves all V7 reads, exact revision mismatch, mutation rejection,
  and old-route 404;
- provider, fixed/calendar timeframe, Data Acquisition, Database Bootstrap,
  import-service, Linux install, and host-transaction focused Harnesses pass;
- deployed-runtime evidence contains six V7 components, four loopback units,
  four proxy routes, ten writer surfaces, and the native market-data smoke;
- the standalone Harness scans the active browser/server/script/deploy/runtime
  manifests and rejects seven representative legacy root/entry/unit/route/env/
  archive/reference failures;
- H093 accepts that machine-enforced no-legacy-runtime invariant. Historical
  sessions and old milestone documents retain their original facts and are not
  production dependencies.

The regenerated production architecture baseline contains 51 modules, 127
dependency edges, 115 construction sites, 19 writer sites, and zero blocking
findings. Source Quality contains 319 production files, 24,940 effective lines,
2,640 functions, 311 public exports, and zero known violation.

All 95 top-level Harnesses were run sequentially against the V7 service and the
existing DuckDB. Ninety-two passed. The only three failures are the same open
visual gates already recorded before R12.2: Session date-picker pixels,
`multi-mixed` Pane pixels, and the Replay Workspace candle-body fixture. The
production regression matrix reproduced its two inventoried cases exactly and
reported no unexpected failure; no baseline for those open findings changed.

## Human Gate

Deploy the same committed release to one host upgraded from the old unit and
one clean lightweight host. Confirm authenticated Sessions and charts load,
cross-device state and Database Bootstrap/re-upload work, only V7 units/routes
remain, `/opt/replay-lab/current/v4` is absent, and the external DuckDB
fingerprint is unchanged. Inject one staged deployment failure on the upgrade
host and record that the old release/unit/health return. These host checks do
not close the separate phase-one visual and interaction acceptance checklist.
