# V7 Server State Sync — R10.8

Status: implemented with automated evidence; physical two-computer and backup/
restore acceptance pending

## Product Decision

R10.8 keeps V7 local-first while adding one authenticated, user-scoped server
copy of durable workstation state. Its first deployment has one existing Caddy
Basic Auth identity, normally `reviewer`; the protocol and database key every
snapshot by authenticated `userId` so later trusted users do not share an
implicit global namespace.

This step is not a complete account system. It adds no registration, password
recovery, sharing, roles, entitlement, Marketplace, or administrator UI. Caddy
continues to own the acceptance-host login. A later application-account
decision may replace that identity provider without changing the state schema.

## Scope

The replicated snapshot contains only the existing durable V7 browser keys:

- the Session index and versioned Session records, including the accepted
  Workspace checkpoint and Replay cursor;
- global Replay Navigation preferences;
- global Workstation Settings;
- global color history.

Market bars, the external DuckDB, provider cache, native Chart state, menus,
active pointers, pending transactions, and credentials are excluded. The
market-data DuckDB remains read-only and is never attached to the state store.

## Ownership And Consistency

The existing Session Store and its synchronous local Web Storage repository
remain the immediate durable command boundary. Network I/O must not enter a
Session Store compare-and-swap or a Workspace visible transaction.

`adapter.server-state-sync` owns replication only. It wraps the injected Web
Storage surface, observes writes to the allowlisted V7 keys, and serializes one
complete immutable snapshot to the server after local success. Its network
state cannot write Chart, Replay, Workspace State, Session records, or Settings
through private owner APIs.

The server stores one complete snapshot per authenticated user with one
strictly increasing revision. PUT uses `expectedRevision`; a stale writer
receives HTTP 409 plus the current server snapshot. No last-write-wins fallback
or silent merge is allowed.

## Bootstrap And Conflict Policy

Before production ModuleHost startup, the adapter compares local state, the
server snapshot, and local replication metadata:

1. empty server plus non-empty local state uploads the current device once;
2. non-empty server plus empty local state hydrates the new device;
3. equal snapshots converge without a write;
4. only-local change over an unchanged known server revision uploads;
5. only-server change over an unchanged known local baseline hydrates;
6. divergent or unknown non-empty state enters `conflict` and changes neither
   side.

Conflict resolution is explicit. `Use server` first saves a device-local backup
then hydrates and reloads. `Keep this device` first saves the server snapshot as
a device-local backup, then performs a revision-checked replacement. Another
concurrent write may reject that replacement and keep the conflict visible.

R11.1 makes local hydration an exact storage transaction. Before applying a
remote snapshot the adapter captures byte-identical prior values for every
allowlisted entry and its replication metadata. If any remove/set operation
fails, it restores all captured values and metadata before reporting failure;
the server revision is not accepted and conflict/offline state remains
truthful. Timeout, polling, upload, and hydration paths release their timer,
AbortSignal, and XHR listeners on every terminal outcome.

If both application and restoration fail, exact local state can no longer be
proven. The adapter enters a terminal `poisoned` / reload-required state,
rejects subsequent synchronized-storage mutations, blocks ordinary Retry, and
prevents Session application initialization. A new page lifecycle is required
before synchronization or Session mutation can resume.

The customer-visible states are `Local`, `Syncing`, `Synced`, `Offline`,
`Conflict`, and the exceptional reload-required state. Every remote read/write
has a five-second hard timeout. Failure to
reach an unavailable or hanging state service preserves local V7 operation; it
never reports remote durability. Offline presentation includes an explicit
retry action.

## State Service Contract

The loopback-only Python service exposes:

- `GET /v7/state/health` — process/database health without user state;
- `GET /v7/state/snapshot` — authenticated user's current revision and entries;
- `PUT /v7/state/snapshot` — bounded, revision-checked complete replacement.

SQLite owns one row per `userId`. Keys, entry counts, individual values, and
total request bytes are bounded and allowlisted. The service accepts identity
only from a trusted loopback proxy header and never accepts a user id in the
JSON payload.

## Deployment And Security

The state service runs as `replay-lab-state.service` on
`127.0.0.1:8767` and writes only
`/var/lib/replay-lab/state/replay-lab-state.sqlite3` (or the configured state
root). It is not opened in the cloud security group.

Authenticated Caddy deployments route only `/v7/state/*` to that service and
overwrite the upstream user header with the verified Basic Auth identity. All
other remote POST/PUT/PATCH/DELETE methods remain blocked. An explicitly
unauthenticated public deployment receives no state-write route and stays
browser-local. Private SSH-tunnel deployment proxies the same path through the
loopback V7 web service under one configured local identity.

The deployment rollback unit is the immutable code release plus three Replay
Lab services and the managed Caddy configuration. State data is not deleted or
rolled back with a code release; schema changes must remain backward readable
or receive a separately backed-up migration.

## Acceptance Evidence

Automated evidence must prove:

- two user identities are isolated in one SQLite file;
- restart preserves a snapshot and its revision;
- stale expected revision returns 409 without mutation;
- invalid identity, keys, JSON, size, and methods fail closed;
- first-device upload, second-device hydration, offline local continuity,
  ordered writes, conflict detection, and both explicit resolution paths;
- production boot remains valid when the optional sync adapter is absent;
- Linux dry-run renders the state service, writable state path, authenticated
  state route, and unchanged read-only market database;
- public unauthenticated mode exposes no state mutation route;
- real browsers on two isolated profiles restore the same Session and
  Workspace checkpoint after server synchronization.

The automated implementation passes all state-service, client, UI,
two-isolated-profile browser, optional-removal, architecture/source, and Linux
rendering gates. The real lightweight-host gate must additionally record SQLite backup/restore,
service restart, cross-computer login, conflict presentation, and unchanged
market-database evidence. Automated completion does not close that human gate.
