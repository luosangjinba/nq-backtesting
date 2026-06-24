# Step 343 - Default-User Server Workspace Persistence Foundation

## Goal

Add the first server-side user-private workspace persistence foundation without introducing login.

This step uses:

```text
user_id = default
workspace_id = default
```

The goal is not full multi-user support. The goal is to make future multi-user support less disruptive by ensuring new server-side workspace data already has an owner/workspace boundary.

## Step 343.1 - Choose Storage Backend

Status: complete.

Decision:

```text
Use per-user JSON documents under v4/data/users/default/workspaces/default for the first foundation.
```

Initial layout:

```text
v4/data/users/default/workspaces/default/preferences/<domain>.json
v4/data/users/default/workspaces/default/instruments/<instrument>/<domain>.json
```

Why JSON first:

- It is easy to inspect during the single-user server migration.
- It is included naturally when Step 342 backs up `v4/data`.
- It avoids mixing user workspace writes into the large market-data DuckDB.
- It can be migrated later into tables with the same `user_id`, `workspace_id`, `instrument`, and `domain` fields.

Tradeoffs:

- File writes need atomic replace and a small process-local lock.
- The first version should use last-write-wins instead of trying to merge concurrent edits.
- This is not enough for real multi-user concurrency, but it is appropriate for default-user single-server mode.

Rejected for first cut:

- New DuckDB tables: more structured, but it couples user workspace writes to the market-data DB and makes rollback riskier during the migration.
- Browser-only localStorage: already works locally, but does not solve multi-device server persistence.

## Step 343.2 - Define Workspace API Contract

Status: pending.

## Step 343.3 - Add Server Auth Placeholder

Status: pending.

## Step 343.4 - Pick First Low-Risk Domain

Status: pending.

## Step 343.5 - Build LocalStorage Migration Path

Status: pending.

## Step 343.6 - Conflict and Locking Rule

Status: pending.

## Step 343.7 - Tests and Closeout

Status: pending.
