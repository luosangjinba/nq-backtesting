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

Status: complete.

Implemented in `v4/v4_api.py`:

```text
current_user_id() -> "default"
current_workspace_id() -> "default"
```

Added server-side workspace document helpers:

- `read_workspace_document(domain, instrument=None)`
- `write_workspace_document(payload)`

Added HTTP endpoints:

```text
GET /v4/workspace?domain=display-preferences
PUT /v4/workspace
```

Safety boundaries:

- Client cannot set `user_id`.
- Client cannot set `workspace_id`.
- Domain is validated and must be in `ALLOWED_WORKSPACE_DOMAINS`.
- Initial allowed domain is only `display-preferences`.
- Non-instrument-scoped domains reject an `instrument` parameter.
- Payload must be a JSON object.
- Writes use a process-local lock and atomic `os.replace`.

Data Maintenance remains separate:

- `/v4/data_maintenance/run` still requires the maintenance header and allowed origin.
- Workspace endpoints are normal trusted-LAN app endpoints, not admin maintenance endpoints.

## Step 343.4 - Pick First Low-Risk Domain

Status: complete.

Selected first domain:

```text
display-preferences
```

What it contains today:

- UI scale.
- Chart text scale.
- Inspector density.

Why this domain:

- It is user-private but low risk.
- It does not affect market data, order review objects, PDA geometry, or replay behavior.
- It already has a compact localStorage payload under `v4:display-preferences`.
- If server sync fails, localStorage fallback is enough.

Not selected for Step 343:

- PDA annotations: important core research objects; defer to Step 344 after the workspace foundation is stable.
- Order Setup / Live Records: too high impact for the first persistence foundation.
- Pane/comparison workspace: useful, but it touches active layout and pane semantics; keep it after display preferences.

Step 343 acceptance for this domain:

```text
Device/browser A saves display preferences to server.
Device/browser B can load the same preferences from server.
LocalStorage remains as rollback/fallback.
```

## Step 343.5 - Build LocalStorage Migration Path

Status: complete.

Implemented client modules:

- `v4/src/storage/server-workspace-client.js`
- `v4/src/display/display-preferences.js`

Migration behavior:

```text
1. On startup, localStorage display preferences are applied immediately.
2. The browser then asynchronously reads `GET /v4/workspace?domain=display-preferences`.
3. If the server document exists, server preferences are applied and localStorage is refreshed as rollback/fallback.
4. If the server document is missing but localStorage exists, the local payload is uploaded to the default server workspace.
5. Future preference changes write localStorage first and then best-effort PUT the server workspace document.
```

Fallback behavior:

- If fetch is unavailable, server sync is skipped.
- If server sync fails, localStorage remains the active source.
- Reset writes defaults locally and best-effort to server.

Server payload shape for this domain:

```json
{
  "version": 1,
  "savedAt": "ISO timestamp",
  "preferences": {
    "uiScale": "100",
    "chartTextScale": "normal",
    "inspectorDensity": "compact"
  }
}
```

## Step 343.6 - Conflict and Locking Rule

Status: complete.

Conflict rule:

```text
Last write wins.
```

Why:

- `display-preferences` is low risk and small.
- Multi-device concurrent editing is not a first-cut requirement.
- The first server workspace goal is ownership and backup coverage, not collaboration.

Locking/write rule:

- Server writes use `_WORKSPACE_LOCK` to serialize writes inside the running API process.
- Server writes write a temp file first, then `os.replace` to atomically replace the document.
- The response includes `savedAt` and `revision`; both currently use the server write timestamp.
- The client does not yet send an expected revision.

Operational rule:

- Avoid editing the same workspace preference on two devices at exactly the same time.
- If the value looks wrong, set it again from the intended browser; that becomes the latest server value.

Future upgrade path:

- Add `expectedRevision` to PUT.
- Return `409 conflict` when the stored revision differs.
- Add per-domain merge only where it is worth the complexity.

## Step 343.7 - Tests and Closeout

Status: pending.
