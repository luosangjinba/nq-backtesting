# V4 Single-Machine to Server Migration Goal

Date: 2026-06-23

## Purpose

Define a clear target for moving V4 from a single-machine workflow to a server-centered workflow.

This is a goal document, not an implementation checklist. It should keep the server work focused and prevent scope creep into full multi-user SaaS before the single-user server baseline is stable.

Related documents:

- `v4/docs/planning/server_sync_short_term_plan.md`
- `v4/docs/planning/server_sync_inventory_runbook.md`
- `v4/docs/planning/server_multi_user_data_model_audit.md`

## Migration Goal

Move V4 to this operating model:

```text
One trusted server runs V4.
All computers open the server URL in a browser.
The server owns canonical market/calendar data and refresh jobs.
User research/workspace data has a documented path from browser-local state toward user-scoped server state.
Backups and restore smoke tests exist before daily use depends on the server.
```

The first server version is still single-user. It should be designed as if the user id is `default`, but it does not need login, permissions, or multi-user concurrency yet.

## Target State

### Runtime

- V4 static files are served from the server.
- V4 API is served from the server.
- Data Maintenance is served from the server.
- Client computers do not run normal daily V4 services locally.
- The same URL is used from every device on the trusted network.

Example:

```text
http://SERVER_HOST:8001/index.html
http://SERVER_HOST:8001/data-maintenance.html
http://SERVER_HOST:8766/v4/health
```

### Canonical Data

The server owns:

- Futures bar DuckDB.
- Economic calendar CSV.
- VIX CSVs.
- Daily regime CSVs.
- Refresh/import outputs for supported automatic instruments.
- Server `.env.local` and API keys.

The server should be the only normal place where refresh jobs run.

### Browser-Local Data During First Cut

These remain browser-local at first:

- PDA annotations.
- Market segments and segment groups.
- Order setups/reviews.
- Live records.
- Chart notes.
- Daily time reviews.
- Time overlays.
- Economic event notes.
- Display/pane/comparison preferences.
- Replay/date-range history.

This is acceptable only if it is explicit. Server migration does not yet mean these objects automatically sync between computers.

### Future User Namespace

Any new server-side workspace persistence should assume:

```text
user_id = "default"
workspace_id = "default"
```

That keeps single-user server work compatible with future login/multi-user work.

## Non-Goals for This Migration

Do not include these in the first server baseline:

- Full multi-user login.
- Public internet exposure.
- Realtime collaboration.
- Offline edit and later merge.
- Conflict resolution between two browsers editing the same object.
- Automatic sync of every existing `localStorage` key.
- Arbitrary user-uploaded market data as shared canonical data.

These can be planned later after the server baseline is stable.

## Acceptance Criteria

### Runtime Acceptance

- `bash v4/start.sh start` or the selected service manager starts web and API services.
- `bash v4/start.sh stop` stops them cleanly.
- `bash v4/start.sh restart` restarts them cleanly.
- `GET /v4/health` returns OK from the server itself.
- `index.html` loads from at least two client devices.
- `data-maintenance.html` loads from at least one client device.

### Data Acceptance

- Both client devices can load the same instrument/date range from the same DuckDB.
- Both client devices see the same economic calendar events.
- Refresh Range runs on the server and writes the server DuckDB only after explicit confirmation.
- A no-data date range is distinguishable from a failed import or failed server.
- `V4_TRADING_DB` points to the intended canonical database path.

### Maintenance Acceptance

- Data Maintenance POSTs are allowed only from approved origins.
- `.env.local` is present only on the server and is not committed.
- Databento/API keys are stored only in server-local config.
- Refresh jobs are documented as server-only normal operations.

### Backup Acceptance

- DuckDB and `v4/data` can be backed up with one documented command.
- Restore smoke has been run into a temporary directory.
- Backup location is outside the live data directory.
- Backup scope includes any future `data/users/default` directory before server-side workspace data is introduced.
- Real maintenance writes require the operator to identify the latest usable backup first.

### Multi-Device Acceptance

- Device A and Device B load the same latest bars for the same instrument/date range.
- Device A and Device B can both use the same server URL without changing client code.
- Any data that remains browser-local is documented and not mistaken for synced server data.

## Migration Phases

### Phase 1: Freeze Goal and Inventory

Deliverables:

- This goal document.
- Existing inventory/runbook reviewed.
- Multi-user data boundary audit reviewed.

Exit criteria:

- Clear agreement on what the first server baseline does and does not promise.

### Phase 2: Server Runtime Baseline

Deliverables:

- Server start/stop/restart path.
- API health check.
- Static web page served from the same host.
- Remote browser load smoke.

Exit criteria:

- At least one non-server computer can load bars through the server.

### Phase 3: Canonical Data Path

Deliverables:

- Chosen canonical data directory.
- Chosen DuckDB path.
- `.env.local` values documented locally on the server.
- Current data copied or migrated.

Exit criteria:

- API and refresh scripts use the same canonical DuckDB.

### Phase 4: Maintenance and Refresh

Deliverables:

- Refresh Range dry-run/write verified from remote browser.
- Economic calendar verify/update path verified.
- VIX/daily regime refresh path documented.

Exit criteria:

- Supported data refresh jobs are run from the server and verified from a client browser.

### Phase 5: Backup and Recovery

Deliverables:

- Backup command.
- Restore smoke command.
- Backup retention note.
- Rollback drill.
- Pre-write backup guard.

Exit criteria:

- Restore smoke succeeds before relying on server data daily.
- The runbook states when to use runtime fallback versus data restore.
- The runbook states that browser `localStorage` is origin-scoped and Review JSON export is needed before switching origins/devices if draft objects matter.

### Phase 6: Default User Workspace Design

Deliverables:

- Choose first server-side workspace persistence domain.
- Use `user_id = default`.
- Provide migration from current localStorage for that domain.

Recommended order:

1. Display/pane/workspace preferences.
2. PDA annotations.
3. Segments.
4. Order setups and live records.
5. Remaining review/journal domains.

Exit criteria:

- The first user-private domain can survive browser/device changes because it is server-backed.

## Rollback Strategy

Before switching daily work to the server:

- Keep the original local setup working.
- Keep a hard backup of the current repo and data.
- Keep a copy of the current DuckDB.
- Do not delete browser `localStorage` state until server migration is verified.
- Export Review/PDA JSON before migrating any research object domain.

Rollback means:

```text
Stop using server URL.
Return to local index/API.
Restore DuckDB/data from backup if server writes caused a problem.
Re-import browser-local JSON if needed.
```

Step 342 baseline:

- Backup helper successfully backed up the repo-local DuckDB and `v4/data`.
- Restore smoke succeeded against a temporary restored data directory.
- Runbook now requires a known usable backup before real maintenance writes.
- Production still needs a persistent backup directory; the Step 342 `/tmp` backup is smoke-only.

## Open Decisions

- Actual server hostname/IP.
- LAN-only vs Tailscale/VPN-only.
- Canonical DuckDB path.
- Backup directory and retention count.
- Whether systemd should become the default service manager.
- First server-backed user-private persistence domain.

## Recommended Immediate Next Step

Do not start with multi-user login.

Start by closing the server baseline:

```text
server URL + canonical DuckDB + refresh job ownership + backup/restore smoke
```

Then introduce `user_id = default` for one small workspace persistence domain.
