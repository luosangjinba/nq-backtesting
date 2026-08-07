# V7 Standalone Runtime Separation — R12.2

Status: binding implementation contract (2026-08-06)

## Decision

V7 is a complete deployable product. A V7 release must boot, serve market
history, restore user state, and perform first-run database import when the
repository and deployed release contain only `v7/` plus explicitly configured
external data/state paths. No V4/V5/V6 source file, service, environment
variable, URL, or configuration asset is a production dependency.

The existing DuckDB `futures_1m` schema remains the accepted external data
contract. Reusing a database created by an older tool is data compatibility,
not runtime coupling; V7 never imports or executes that tool to read it.

## Runtime Boundaries

The deployed read path is:

```text
browser provider
  -> /v7/market-data/*
  -> replay-lab-market-data.service (loopback 8766)
  -> v7/server/market_data_api.py
  -> external read-only DuckDB
```

`service.v7-market-data` owns the HTTP adapter and DuckDB queries. It opens the
database read-only, rejects POST/PUT/PATCH/DELETE, and exposes V7-owned health,
bars, available-date, projected-history, target-bar, price, and optional
economic-event reads. Dataset revision is derived from the active database/WAL
identity and is part of every cacheable bar/projection contract.

The browser owner is `adapter.market-data-provider`. Bar Data remains the only
raw requester/cache owner; the provider only translates between the public V7
HTTP contract and provider-neutral values. Replay, Projection, Workspace,
Chart, Session, and Viewport ownership do not change.

## Deployment And Upgrade

The immutable release archive contains only `v7/`. The market database,
state SQLite, upload staging, secrets, and optional economic-calendar data are
external state and are never copied into the release.

Deployment writes only `V7_MARKET_DATA_*` market-service configuration and
starts `replay-lab-market-data.service`. Caddy exposes only
`/v7/market-data/*` for that service; there is no `/v4/*` compatibility alias.
Ports 8007, 8766, 8767, and 8768 remain loopback-only.

An upgrade from a pre-R12.2 host treats `replay-lab-api.service` as migration
state. Its file, enabled state, active state, environment, current release, and
proxy configuration are captured in the host transaction. The old service is
stopped before the new service claims 8766. Success removes the old unit;
failure restores the old release and unit state before validating the old
health contract. This compatibility exists only in the installer transaction,
not in the deployed V7 runtime.

## Database Bootstrap And Maintenance

The first-run importer targets `V7_MARKET_DATA_DB` and remains the sole owner
of upload staging, strict CSV conversion, candidate validation, discard, and
create-if-absent activation. Market Data receives no write authority.

The historical Databento refresh and Contract Roll writer is not migrated into
the read service. Standalone deployment leaves that optional V7 maintenance
capability disabled and labels it as such; Database Bootstrap remains usable.
If online acquisition returns, it must be a separately deployed V7 service
with its own writer inventory, authentication, backup, rollback, and Harness
contract. Calling older-version maintenance code is prohibited.

## Executable Gates

R12.2 is complete in repository evidence only when all of the following pass:

- the V7 market-data service starts from `v7/server` against a temporary
  DuckDB, returns the V7 routes, rejects mutation, changes revision on source
  identity change, and returns 404 for the old health route;
- provider, projected-history, date availability, replay/workspace, and
  production-regression Harnesses use only `/v7/market-data/*`;
- production source/deployment scans reject V4 imports, paths, route prefixes,
  provider IDs, and environment variables, with only explicit installer
  migration recognition allowed;
- deployed-runtime evidence requires the V7 service/unit and a V7-only release
  archive, with State Sync and Database Bootstrap remaining independently
  removable;
- Linux dry-run, apply, upgrade, rollback, Caddy preservation, and existing /
  missing database cases pass without changing the database fingerprint;
- architecture/source-quality baselines and the complete top-level regression
  inventory are regenerated from the final source tree.

## Human Gate

On one existing acceptance host and one clean lightweight host, deploy the
same committed release and verify authenticated Session Browser, chart history,
cross-device state, database upload/re-upload, service restart, and HTTPS.
Confirm the deployed release has no `v4/` tree, the old unit and `/v4/*` route
are absent after success, the external DuckDB fingerprint is unchanged, and
rollback from an injected failure restores the previously healthy host. This
does not close the still-open phase-one visual and interaction acceptance
items.
