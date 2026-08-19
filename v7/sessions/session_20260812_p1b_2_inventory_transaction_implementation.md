# P1b.2 Local Package Inventory Transaction Implementation

Date: 2026-08-12

Status: implemented; H117 extended and still executable/unaccepted

## Authorization And Boundary

The product owner instructed `授权 P1b.2`. This closes only the second slice of
the accepted `V7_LOCAL_PLUGIN_PACKAGES_AUTHORING_MCP_P1B.md` decomposition:
the package-store domain/runtime, atomic browser-storage adapter, declarative
migration/settings, quarantine, tombstones, and restricted-mode recovery.

This step deliberately adds no Plugin Center local-package UI, Developer Mode,
MCP server, external ModuleHost descriptor, package-code import/evaluation,
publisher trust, activation, Worker, registry, or business contribution. P1b.3
and P1b.4 still require separate product-owner instructions.

## Implemented Ownership

- `core.plugin-contract` now provides pure semantic-version comparison,
  install/upgrade/downgrade/replacement planning, complete package/profile
  settings validation, and a bounded host-interpreted migration chain.
- `core.plugin-package-store` is the sole device-local external-package
  inventory owner. It exposes immutable byte-free snapshots and branded
  preparations; it serializes exact-revision commands and binds confirmation,
  candidate digest, command/transaction identity, receipt, and committed
  revision.
- `adapter.plugin-package-storage` owns only IndexedDB mechanics. Its dedicated
  database atomically updates generation, settings, journal, receipt, and
  inventory stores under revision plus pending-transaction CAS.
- P0b's `core.plugin-profile`, ModuleHost, Server State Sync, and host-owned
  Session/Replay/Annotation/Journal records remain unchanged and outside this
  store.

## Transaction And Recovery Evidence

The owner implements install, settings Apply/Reset, upgrade with declarative
migration, retained-prior rollback, explicit downgrade, same-version changed-
digest replacement, quarantine, and uninstall with retained settings/tombstone
provenance. Every generation stays `installed-inactive`, publisher-untrusted,
and unauthorized for production execution.

Content-addressed generation/settings records already retained by rollback or
a tombstone are reused without overwriting them. Rollback deletes only records
actually staged by that transaction, and final cleanup excludes records still
selected by the committed inventory or retained tombstone.

Each change stages immutable records and a recovery journal, verifies stored
digests, commits the new inventory pointer and receipt atomically, then
finalizes cleanup. Pre-commit failure rolls back to the old complete inventory;
an uncertain post-commit error is accepted only after durable markers prove the
new complete inventory. Restart deterministically rolls back staged journals or
finishes proven committed cleanup. Corrupt/unknown or repeatedly unrecoverable
state enters Restricted Mode with sanitized diagnostics and an exact recovery
token.

Migration remains declarative and package-namespace-only. The P1b.1 wire field
`expectedOutputDigest` binds the canonical from/operations/to plan because a
static manifest cannot predict device-specific user override values; runtime
journal and durable receipt evidence separately record the actual migrated-
output digest, and the staged settings record content-addresses the exact
output. The original state and prior immutable generation remain available for
rollback.

## H117 Additive Gate

H117 remains `executable`, `humanReviewRequired: true`, and has no acceptance
evidence. P1b.2 preserves the 18 P1b.1 contract/archive negative groups and
adds 18 transaction/migration/recovery groups, for 36 total. The additive suite
covers stale/duplicate/concurrent/cancelled commands, all staged-write and
commit uncertainty points, quota, migration digest/precondition/downgrade,
settings validation, rollback/quarantine, corruption, unknown schema, and
repeated recovery failure.

A real headless Chromium fixture additionally proves that a failed multi-store
IndexedDB clone/write leaves revision zero and no generation, a successful
commit survives close/reopen with all five record families, and a stale CAS is
rejected. Static evidence proves the new owner/adapter do not use `eval`,
`Function`, dynamic import, ModuleHost, or Core profile paths, and the package
database key is absent from Server State Sync.

## Machine Closure

The refreshed production source baseline contains 642 files, 60,061 effective lines, 6,152 functions, and 650 public exports, with no source-size/function
exception or finding. The production architecture contains 68 modules, 149
actual dependency edges, 133 construction sites, 27 writer sites, and zero
findings. The two new writer surfaces close exactly over
`core.plugin-package-store` and `adapter.plugin-package-storage`.

Focused H117, Developer Kit, ModuleHost/Core Plugin Center, Server State Sync,
production module assembly, architecture/writer/source-quality, deployed-
runtime, hardening, and regression gates passed, followed by
`git diff --check`.

## Exact Next Gate

The next product decision is whether to separately authorize P1b.3 Plugin
Center and Developer Mode. Do not implement P1b.3, P1b.4 MCP/H117 acceptance,
P2 registry, P3a Worker, P3b Pine migration, or later business/plugin work from
this record.
