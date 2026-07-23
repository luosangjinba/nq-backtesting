# V7 Replay Navigation Preference Store

Status: active global preference owner (2026-07-22)

## Ownership

`core.replay-navigation-preference-store` is the sole durable writer for the
seven Quick GoTo wall times. The value is workstation-wide: every existing and
future Replay Session reads the same committed schedule. Session Store does not
write, reset, or delete this preference.

The preference owner receives an injected string storage port. It owns one
versioned `v7.replay-navigation-preferences` envelope and delegates value
validation/serialization to `core.replay-navigation-settings`. It owns no DOM,
Replay cursor, schedule calculation, bars, Pane state, or chart surface.

## Commit And Mount Rules

- Save validates and durably writes the complete value before replacing the
  in-memory authority.
- A failed write preserves the previous snapshot.
- Saving does not update any Session revision or issue a Workspace transaction.
- A newly mounted Session receives the latest global snapshot before its first
  Workspace construction.
- Deleting any Session leaves the global preference key untouched.

## Legacy Migration

Session workspace schema 3 remains readable only as legacy migration input.
When no valid global envelope exists, application composition orders legacy
schema-3 candidates by most recently updated Session, chooses the first valid
settings wire, and immediately persists it globally. Once the global record
exists, Session records are never consulted again.

Session workspace schema 4 stored Pane Layout only. Current schema 5 stores Pane
Layout plus the separate Session-scoped Layout Sync policy. The next Pane Layout
or Layout Sync save of a legacy schema-3 Session rewrites it as schema 5 and
removes the retired Session-scoped navigation-settings field.

## Gate

`tests/replay-navigation-preference-store-harness.js` binds defaults, durable
reconstruction, legacy seeding, corrupt-record recovery, and write-failure
atomicity. The real-Chrome Replay Pane Workspace Harness binds cross-Session
inheritance, a separate global storage record, absence from current Session
records, and survival after deletion of the Session that changed the value.
