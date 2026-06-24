# Multi-User Login Readiness Review

Date: 2026-06-24

Purpose: decide whether V4 is ready to add real multi-user login after the default-user workspace migration.

## Current State

V4 is ready for single-user server mode with a default-user namespace.

It is not ready to expose multiple real users yet.

The server workspace API already has these future replacement points:

```text
current_user_id() -> "default"
current_workspace_id() -> "default"
```

Server-backed user-private domains now live under:

```text
v4/data/users/default/workspaces/default
```

## User-Private Domains Covered

These domains have a user/workspace boundary through the default workspace path:

- `display-preferences`
- `pda-annotations`
- `market-segments`
- `order-reviews`
- `live-records`
- `chart-notes`
- `daily-time-reviews`
- `time-overlays`
- `economic-event-notes`
- `entry-context-catalog`
- `import-batches`

## Shared Global Data

These should remain shared unless a future product decision introduces private datasets:

- Futures OHLC bars in DuckDB.
- Economic calendar source data.
- VIX/daily regime source data.
- Data Maintenance refresh jobs.

## Login Blockers

Do not add real multi-user login until these are solved:

1. Replace hardcoded `current_user_id()` with authenticated session identity.
2. Add a users/session store.
3. Add password/session cookie handling or place V4 behind a trusted identity proxy.
4. Bind every `/v4/workspace` read/write to the authenticated user.
5. Add CSRF protection for state-changing requests.
6. Restrict Data Maintenance POST actions to an admin user or trusted local operator.
7. Add per-user backup/restore rules for `v4/data/users/<user_id>`.
8. Decide whether uploaded files are stored, hashed, or discarded after import.
9. Add upload size limits before allowing browser uploads to server storage.
10. Add an admin path to list users/workspaces without exposing another user's data.

## Migration Rule

The default-user filesystem layout should migrate directly:

```text
v4/data/users/default/workspaces/default
```

to:

```text
v4/data/users/<user_id>/workspaces/<workspace_id>
```

No workspace document should be moved into a flat global path.

## Recommendation

Next server work should harden the single-user server path before login:

- backup/restore includes `v4/data/users/default`;
- workspace API has clear tests for all allowlisted domains;
- Data Maintenance actions stay protected by local-origin/header checks;
- login remains deferred until security hardening is complete.
