# Session — R10.8 Authenticated Cross-Device State Sync

Date: 2026-08-05
Status: implemented; physical two-computer acceptance pending

## Trigger And Decision

The cloud acceptance host restored Sessions only on the browser that created
them because the production application injected `localStorage` as its sole
durable persistence surface. Caddy Basic Auth protected the site but did not
provide application state.

R10.8 retains that local-first command boundary and adds one optional,
user-scoped server snapshot. It deliberately does not add registration,
password recovery, roles, sharing, or a second Session Store. The verified
Basic Auth username supplies the initial state identity.

## Delivered

- `adapter.server-state-sync` wraps only the allowlisted durable V7 Web Storage
  keys after preserving every immediate local write;
- first-device import, empty-device hydration, ordered writes, five-second
  timeout, Offline retry, strict revision conflict, local backups, and both
  explicit conflict choices are bound;
- a loopback Python service owns per-user SQLite rows and validates identity,
  schema, keys, sizes, JSON, methods, and expected revision;
- production boot remains valid when the optional adapter or trusted state
  route is absent;
- the Linux installer owns `replay-lab-state.service` on 8767, a separate
  writable state directory, and authenticated `/v7/state/*` proxying while the
  external market DuckDB stays read-only;
- release rollback restarts API/state/Web together without deleting or rolling
  back user state.

## Automated Evidence

- state-service Harness: user isolation, CAS rejection, bounds, methods, and
  restart durability pass;
- sync-client Harness: import, hydration, serialized writes, hanging-network
  timeout, Offline retry, conflict detection, both resolutions, and local-only
  fallback pass;
- real-browser Harness: a second isolated Chrome profile restores the exact
  Session and Workspace checkpoint from the first profile;
- Session Browser independent Chrome gate proves visible Offline retry,
  conflict selection, subscription cleanup, and normal disposal;
- production application Host and module assembly prove state-sync optional
  removal; architecture records 49 modules and nine critical writer sites with
  zero findings;
- Linux deployment rendering, Caddy validation, unauthenticated fail-closed
  behavior, shell syntax, Python compilation, source-quality, and diff checks
  pass.

The complete 85-Harness sweep passed 82 functional/contract/architecture
gates. Three exact PNG comparisons remain open without fixture replacement:
the two pre-existing Replay Pane/Workspace visual findings already recorded in
the handoff, plus a visually indistinguishable Session date-picker PNG byte
drift on the current Chrome host. None intersects the new state-service or
replication assertions.

## Remaining Human Gate

Deploy the committed revision to the lightweight host, sign in as the same
reviewer from two physical computers, and confirm the exact Session/Workspace
checkpoint. Also exercise Offline retry and one deliberate conflict, perform a
stop/copy/start SQLite backup and restore, restart/redeploy all three services,
and prove the market DuckDB fingerprint remains unchanged. Overall acceptance
and the separate Data Acquisition gate remain open until their own checklists
close.
