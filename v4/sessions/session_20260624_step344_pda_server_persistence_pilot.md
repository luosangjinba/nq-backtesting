# Step 344 - PDA Annotations Server Persistence Pilot

## Goal

Use PDA annotations as the first core research object to validate default-user, instrument-scoped server workspace persistence.

This step builds on Step 343:

```text
user_id = default
workspace_id = default
storage = v4/data/users/default/workspaces/default
```

## Step 344.1 - Freeze PDA Server Schema

Status: complete.

Workspace domain:

```text
pda-annotations
```

Scope:

```text
instrument-scoped
```

Storage path:

```text
v4/data/users/default/workspaces/default/instruments/<instrument>/pda-annotations.json
```

Workspace document envelope:

```json
{
  "user_id": "default",
  "workspace_id": "default",
  "domain": "pda-annotations",
  "instrument": "NQ",
  "version": 1,
  "savedAt": "ISO timestamp",
  "revision": "ISO timestamp",
  "payload": {
    "version": 1,
    "savedAt": "ISO timestamp",
    "instrument": "NQ",
    "annotations": []
  }
}
```

Annotation payload rule:

- Keep the existing PDA annotation object as the payload record for the pilot.
- Preserve `id`, `type`, prices/times/points, `contexts`, display fields, `sourceChartId`, `sourceInstrument`, `sourceTimeframe`, `sourceTimeframeLabel`, `createdAt`, and `updatedAt`.
- Do not introduce a new per-record table/schema in this step.
- Filter out draft annotations before persisting, matching existing localStorage behavior.

Record identity:

```text
record_id = annotation.id
```

Deletion strategy:

```text
full-document replacement
```

Rationale:

- Existing PDA store already treats the full annotation array as the persistence unit.
- Full replacement keeps Step 344 aligned with the Step 343 JSON document foundation.
- Soft-delete/per-record merge can be introduced later if conflict handling becomes necessary.

Source pane metadata:

- `sourceChartId` / pane metadata remains descriptive only.
- It is not a user boundary.
- No Sync/Sync pane state is not part of the user ownership model.

Conflict rule:

```text
Last write wins for the whole instrument/domain document.
```

Rollback:

- Existing localStorage key `v4:pda-annotations:<instrument>` remains the fallback.
- Existing PDA Review JSON export remains the manual hard backup before migration.

## Step 344.2 - Add PDA Workspace Endpoints

Status: complete.

Implementation:

- Added `pda-annotations` to `ALLOWED_WORKSPACE_DOMAINS` in `v4/v4_api.py`.
- Marked it as instrument-scoped:

```python
"pda-annotations": {"instrumentScoped": True}
```

The existing Step 343 workspace endpoints now support:

```text
GET /v4/workspace?domain=pda-annotations&instrument=NQ
PUT /v4/workspace
```

Write request shape:

```json
{
  "domain": "pda-annotations",
  "instrument": "NQ",
  "version": 1,
  "payload": {
    "version": 1,
    "savedAt": "ISO timestamp",
    "instrument": "NQ",
    "annotations": []
  }
}
```

Validation:

- `instrument` is required for `pda-annotations`.
- The server still controls `user_id=default` and `workspace_id=default`.
- Unsupported domains and invalid instruments are rejected by the shared workspace guard.
- Full-document replacement remains the write strategy.

Smoke coverage:

- `v4/tests/workspace-api-smoke.py` now writes and reads an NQ `pda-annotations` workspace document.

## Step 344.3 - Wrap Existing Persistence Module

Status: pending.

## Step 344.4 - Migration UI/Command

Status: pending.

## Step 344.5 - Two-Device PDA Smoke

Status: pending.

## Step 344.6 - Backup/Restore Inclusion

Status: pending.

## Step 344.7 - Closeout Decision

Status: pending.
