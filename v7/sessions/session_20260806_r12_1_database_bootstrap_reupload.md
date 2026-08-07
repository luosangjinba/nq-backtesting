# Session — R12.1 Database Bootstrap Re-upload Recovery

Date: 2026-08-06
Status: implemented with automated evidence; lightweight-host review open

## Finding

The first clean-host DuckDB acceptance run successfully uploaded its large
source, then encountered an unavailable importer during Validate. The retained
task correctly survived deployment recovery, but the page still allowed the
administrator to select the same file again. The importer rejected that second
upload through its one-candidate lock, leaving the administrator dependent on
shell/API diagnostics to discover and clear staging.

## Decision And Ownership

R12.1 adds re-upload recovery without broadening database authority:

- `adapter.database-bootstrap-ui` owns the visible intent, retained-task
  presentation, inline two-button confirmation, and local control reset;
- `service.v7-database-import` remains the only owner allowed to remove a
  staged source or hidden candidate;
- V4 Maintenance, Bar Data, Replay, Workspace, Chart, Session, Caddy topology,
  and the authoritative market database receive no new authority.

The authenticated command is `POST /v7/database/import/discard` with the exact
retained `uploadId`. It accepts stable `uploaded`, `ready`, and `failed` tasks,
rejects `preparing`, disabled, target-present, activation-locked, and activated
states, and hides another user's task behind `404`. Cleanup persists an
idempotent `discarded` tombstone after removing only the controlled source and
candidate. The target DuckDB and activation lock are never passed to the
discard path.

## User Workflow

While a retained task exists, the file picker is disabled and the page exposes
`Upload another file`. The first click opens an inline explanation with `Keep
current file` and `Discard and choose another`; no shell command, API command,
or typed phrase is required. Cancel preserves the current task. Confirm resets
the file, progress, and activation controls only after the service accepts the
discard, then focuses the file picker. A `DATABASE_IMPORT_BUSY` response also
recovers the retained server task into this same workflow.

The exact `ACTIVATE DATABASE` phrase remains a separate authority boundary for
creating the first authoritative database and is intentionally unchanged.

## Automated Evidence

- the importer service Harness covers failed/uploaded/ready discard, identity
  isolation, idempotence across restart, source/candidate cleanup, released
  upload capacity, a deterministically held `preparing` race, and permanent
  rejection before/after authoritative target removal once activation locked;
- the independent client Harness binds the new POST route/body and accessible
  inline confirmation contract;
- the real Chrome Harness covers ready-task hard-refresh recovery, busy upload
  recovery with rejected local selection/progress cleanup, locked direct
  replacement, focus, Cancel, confirmed discard, second upload, validation,
  activation, and final read-only DuckDB smoke;
- the retained Data Acquisition unit/browser Harnesses pass without updating
  their existing visual fixture; the newly visible retained-candidate
  confirmation has its own exact 1440x900 fixture;
- H092 is accepted from the service Harness and declarative negative cases for
  validation-in-progress, activated-target, and durable-lock rejection.

Architecture, source-quality, deployed-runtime, optional-removal, and complete
top-level regression evidence are recorded by the integrated R12.2 verification
run: 92 of 95 pass, with only the three pre-existing inventoried visual gates.

## Human Gate

Deploy the committed R12.1 release on the current bootstrap host. Use only the
page to discard the retained large DuckDB, upload the intended file, validate
and activate it, then confirm re-upload is permanently unavailable. Record
memory/swap, free disk, elapsed validation time, service restarts, and public
HTTPS behavior; this does not close the separate overall-acceptance checklist.
