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

Status: complete.

Endpoints:

```text
GET /v4/workspace?domain=<domain>[&instrument=<instrument>]
PUT /v4/workspace
```

GET response when a document exists:

```json
{
  "ok": true,
  "found": true,
  "user_id": "default",
  "workspace_id": "default",
  "domain": "display-preferences",
  "instrument": null,
  "version": 1,
  "savedAt": "2026-06-23T20:00:00Z",
  "revision": "2026-06-23T20:00:00Z",
  "payload": {}
}
```

GET response when missing:

```json
{
  "ok": true,
  "found": false,
  "user_id": "default",
  "workspace_id": "default",
  "domain": "display-preferences",
  "instrument": null,
  "version": 1,
  "savedAt": null,
  "revision": null,
  "payload": null
}
```

PUT request:

```json
{
  "domain": "display-preferences",
  "instrument": null,
  "version": 1,
  "payload": {}
}
```

PUT response:

```json
{
  "ok": true,
  "user_id": "default",
  "workspace_id": "default",
  "domain": "display-preferences",
  "instrument": null,
  "version": 1,
  "savedAt": "2026-06-23T20:00:00Z",
  "revision": "2026-06-23T20:00:00Z",
  "payload": {}
}
```

Validation rules:

- `domain` is required and limited to lowercase letters, numbers, and hyphen.
- `instrument` is optional; if present it must be an uppercase instrument symbol.
- `payload` must be a JSON object.
- The first implementation only allows explicit safe domains. It must not become a generic arbitrary file writer.
- `user_id` and `workspace_id` are server-controlled, not client-controlled.

Initial allowed domains:

```text
display-preferences
```

Future domains should be added deliberately as each persistence module is migrated.

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
