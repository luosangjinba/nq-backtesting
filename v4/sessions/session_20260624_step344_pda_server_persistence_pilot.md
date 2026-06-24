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

Status: complete.

Implemented in `v4/src/pda/pda-persistence.js`:

- Existing localStorage persistence remains first-class.
- `saveAnnotations()` writes localStorage first, then best-effort saves to server.
- `restoreAnnotations()` reads localStorage immediately, then asynchronously syncs server unless disabled.
- `syncAnnotationsFromServer(instrument)` loads server PDA annotations when found.
- If the server document is missing and localStorage has PDA annotations, local annotations are seeded to server.
- Draft annotations are filtered from both local and server persistence.

New exports:

- `getPdaWorkspaceDomain()`
- `getPdaStorageKeyBase()`
- `saveAnnotationsToServer(instrument, payload, options)`
- `syncAnnotationsFromServer(instrument, options)`

Fallback:

- If `fetch` is unavailable or the server request fails, localStorage remains active.
- Existing PDA Review JSON export/import is unchanged.

Smoke coverage:

- Added `v4/tests/pda-persistence-smoke.js`.
- The smoke covers local restore, server PUT payload, server restore into store/localStorage, and local-to-server migration when the server document is missing.

## Step 344.4 - Migration UI/Command

Status: complete.

Implemented explicit migration command:

- Added `migrateCurrentPdaAnnotationsToServer()` in `v4/src/pda/pda-persistence.js`.
- Added `Sync PDA to Server` in the Archive inspector panel.
- The UI shows a confirmation prompt:

```text
Export Review JSON or PDA JSON before syncing PDA annotations to the server. Continue?
```

Behavior:

- The command writes the current non-draft PDA annotations to localStorage.
- Then it writes the same payload to the server `pda-annotations` workspace document for the current instrument.
- Existing automatic local-to-server seed still runs when the server document is missing.
- Existing PDA JSON / Review JSON export remains the recommended hard backup before migration.

Smoke coverage:

- `v4/tests/pda-persistence-smoke.js` covers explicit migration PUT payload.

## Step 344.5 - Two-Device PDA Smoke

Status: complete.

Automated smoke:

```bash
node v4/tests/pda-two-device-workspace-smoke.js
```

What it simulates:

```text
Device A:
  - creates one NQ PDA annotation with sourceChartId=comparison-window
  - saves it through PUT /v4/workspace

Device B:
  - starts with empty local PDA state
  - reads the same server workspace document
  - restores the PDA into pda-store and localStorage fallback
```

Validated:

- PDA id survives the server round trip.
- Instrument-scoped `pda-annotations` is used.
- `sourceChartId`, `sourceInstrument`, and `sourceTimeframe` survive as metadata.
- Source pane metadata does not affect `user_id=default` ownership.
- No Sync/Sync pane state remains outside the user boundary.

## Step 344.6 - Backup/Restore Inclusion

Status: complete.

Conclusion:

```text
PDA server workspace data is stored under v4/data/users/default/...
Step 342 backs up and restores the whole v4/data directory.
Therefore PDA server workspace data is in backup scope.
```

Implementation hardening:

- Updated `v4/scripts/backup_v4_data.py` restore smoke to report `user_workspace_files`.
- Added `v4/tests/backup-user-workspace-smoke.py`.

Smoke:

```bash
python3 v4/tests/backup-user-workspace-smoke.py
```

Validated:

- A tarball containing `data/users/default/workspaces/default/instruments/NQ/pda-annotations.json` is restored.
- Restore smoke reports `user_workspace_files: 1`.
- Existing key data file checks remain unchanged.

## Step 344.7 - Closeout Decision

Status: pending.
