# Step 339 - Single-Machine to Server Migration Roadmap

## Context

The project has already completed several server-centered preparation steps:

- Step 332 prepared dynamic client API base, remote Data Maintenance base URL, API bind host/origin configuration, and inventory/runbook docs.
- Step 333 validated the current LAN server baseline with `http://192.168.1.111:8001/index.html`.
- Step 334 improved remote Data Maintenance diagnostics and clarified the K-line maintenance contract.
- Step 335 added runtime hardening artifacts: systemd templates, status script, backup script, deploy runbook.
- Step 336 validated Refresh Range as the short-term server-side K-line maintenance path.
- The multi-user data model audit documents that shared market data and user-private research/workspace data must be separated.
- The migration goal document defines the single-machine -> server target and the first-cut non-goals.

This step turns those documents into a clear sequence of TODO steps.

## Goal

Create a single roadmap that breaks the single-machine -> server migration into large executable steps, with substeps and acceptance gates.

The roadmap should preserve this ordering:

1. Finish the single-user server baseline.
2. Stabilize canonical data/maintenance/backup.
3. Introduce `user_id=default` server workspace persistence.
4. Pilot one core research domain.
5. Migrate remaining workspace domains.
6. Only then consider real multi-user login and permissions.

## Non-Goals

- Do not implement server persistence in this step.
- Do not add login or permissions.
- Do not change runtime behavior.
- Do not change existing storage keys.
- Do not choose a final server host or data path here; record those as Step 340 decisions.

## Roadmap

### Step 339 - Roadmap Freeze

Status: complete.

Purpose:

- Convert the migration goal into executable TODO steps.
- Link the roadmap to the goal and audit docs.
- Keep the distinction between completed groundwork and future implementation.

Substeps:

- Step 339.1: Freeze migration target.
- Step 339.2: Map completed groundwork.
- Step 339.3: Define future execution steps.
- Step 339.4: Record acceptance gates.
- Step 339.5: Record non-goals.

Deliverables:

- `v4/TODO.md` updated with Step 339-345.
- This session file.

### Step 340 - Server Runtime and Canonical Data Cutover

Purpose:

Move from "current LAN smoke works" to a defined daily server runtime and canonical data path.

Substeps:

- Step 340.1: Choose deployment identity.
- Step 340.2: Choose canonical data path.
- Step 340.3: Migrate/copy current data.
- Step 340.4: Configure server `.env.local`.
- Step 340.5: Start runtime through chosen manager.
- Step 340.6: Two-device smoke.
- Step 340.7: Closeout docs.

Acceptance:

- Server URL is fixed.
- API/web/Data Maintenance start and restart reliably.
- Two devices load the same bars/calendar from the same server.
- Runbook records the chosen paths and commands.

### Step 341 - Server Maintenance and Refresh Ownership

Purpose:

Make all supported data refresh/write actions server-owned and operationally clear.

Substeps:

- Step 341.1: Inventory maintenance actions.
- Step 341.2: Confirm admin boundary.
- Step 341.3: Validate Refresh Range production flow.
- Step 341.4: Validate calendar/VIX/regime flow.
- Step 341.5: Decide automation boundary.
- Step 341.6: Failure-mode smoke.
- Step 341.7: Closeout docs.

Acceptance:

- Refresh/write operations run on the server.
- Data Maintenance is treated as trusted admin functionality.
- Failure output is actionable.
- Runbook says which jobs are manual and which are automated or deferred.

### Step 342 - Backup, Restore, and Rollback Gate

Purpose:

Make backup/restore a required gate before daily reliance on server data.

Substeps:

- Step 342.1: Select backup destination.
- Step 342.2: Backup canonical data.
- Step 342.3: Restore smoke.
- Step 342.4: Rollback drill.
- Step 342.5: Add pre-write guard note.
- Step 342.6: Closeout docs.

Acceptance:

- Backup directory is outside live data.
- Restore smoke has been run.
- Rollback steps are written.
- Future `data/users/default` is included before server-side workspace data ships.

### Step 343 - Default-User Server Workspace Persistence Foundation

Purpose:

Introduce the user-private persistence boundary without adding login.

Substeps:

- Step 343.1: Choose storage backend.
- Step 343.2: Define workspace API contract.
- Step 343.3: Add server auth placeholder.
- Step 343.4: Pick first low-risk domain.
- Step 343.5: Build localStorage migration path.
- Step 343.6: Conflict and locking rule.
- Step 343.7: Tests and closeout.

Acceptance:

- Server-side workspace persistence has `user_id=default` and `workspace_id=default`.
- One low-risk domain survives reload/device change through server storage.
- LocalStorage fallback/rollback remains possible.

### Step 344 - PDA Annotations Server Persistence Pilot

Purpose:

Use PDA as the first core research object to validate real user-private server persistence.

Substeps:

- Step 344.1: Freeze PDA server schema.
- Step 344.2: Add PDA workspace endpoints.
- Step 344.3: Wrap existing persistence module.
- Step 344.4: Migration UI/command.
- Step 344.5: Two-device PDA smoke.
- Step 344.6: Backup/restore inclusion.
- Step 344.7: Closeout decision.

Acceptance:

- Device A can create/edit PDA and Device B can reload the same server-backed PDA.
- Existing Review/PDA JSON remains usable.
- Pane/source metadata remains metadata only, not a user boundary.
- Backup includes PDA server data.

### Step 345 - Remaining Workspace Migration and Multi-User Readiness

Purpose:

After the PDA pilot, migrate the rest of the user-private workspace domains and prepare for real multi-user only after ownership boundaries are complete.

Substeps:

- Step 345.1: Migrate segments and segment groups.
- Step 345.2: Migrate Order Setup and Live Records.
- Step 345.3: Migrate notes and review domains.
- Step 345.4: Migrate preferences/history by policy.
- Step 345.5: Add import batch audit.
- Step 345.6: Multi-user login readiness review.
- Step 345.7: Security hardening gate.

Acceptance:

- All user-private domains have a server-side ownership boundary.
- Import/export and backup/restore can be reasoned about per default user.
- Login is not started until shared vs user-private data boundaries are already enforced.

## Dependencies

- Step 340 depends on a chosen server host/path.
- Step 341 depends on Step 340 runtime being stable enough for maintenance writes.
- Step 342 can partially run in parallel with Step 340/341 but must close before workspace server persistence.
- Step 343 depends on Step 342 backup scope being updated to include user workspace data.
- Step 344 depends on Step 343 storage/API foundation.
- Step 345 depends on Step 344 proving the model with PDA.

## Current Status

Planned and recorded only.

No runtime code changed in Step 339.

## Verification

Documentation-only change:

```bash
git diff --check
```

No code smoke required.
