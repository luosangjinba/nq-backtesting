# Session: Step 335 Server Runtime Hardening

Date: 2026-06-23

## Goal

Turn the current V4 server baseline from "manually running and usable" into a safer daily-use runtime.

The immediate goal is not public deployment or cloud sync. It is operational hardening for a trusted LAN/Tailscale server:

- service templates;
- status diagnostics;
- backup and restore-smoke tooling;
- clear refresh/import operation boundaries;
- runbook updates.

## Constraints

- Do not write to `/etc/systemd` from this step.
- Do not enable cron/timers by default.
- Do not move workspace/localStorage state server-side.
- Do not expose V4 to the public internet.
- Prefer repo-contained templates and scripts that the user can install manually on the server.

## Step 335.1 Runtime Hardening Plan and Constraints

Deliverable:

- TODO/session plan.
- Explicit decision that this step creates templates/scripts/runbook only; real service installation remains manual.

Acceptance:

- Step 335 is split into independently verifiable substeps.

## Step 335.2 Service Templates

Add systemd templates for:

- V4 API service on port `8766`.
- V4 static web service on port `8001`.

Requirements:

- Use repo `v4/.env.local` as the environment file.
- Restart API on failure.
- Run static web server from the `v4/` directory.
- Avoid committing secrets.
- Document install, reload, enable, start, status, log, and uninstall commands.

Acceptance:

- Templates live in the repo.
- Runbook explains replacing repo/user paths before installing.

## Step 335.3 Server Status Script

Add a read-only script that reports:

- API health.
- Web page reachability.
- DB path and existence.
- ES/NQ row count and min/max timestamps.
- Calendar/VIX/daily-regime file existence.
- Optional remote host URL checks.

Acceptance:

- Script returns non-zero on hard failures.
- Script can run in a test fixture without network checks.
- Current local server status can be checked with the live LAN URL.

## Step 335.4 Backup and Restore-Smoke Script

Add a script that:

- copies `trading_data.duckdb`;
- archives the V4 data directory;
- writes timestamped backup names;
- optionally extracts the data tarball to a temp directory and verifies key files.

Acceptance:

- Script supports custom backup dir for tests.
- Restore smoke verifies the expected DB/calendar/VIX/regime files.
- It does not require `/var/backups` during automated checks.

## Step 335.5 Refresh Operations Boundary

Update server runbook:

- Normal clients only open `index.html`.
- Data refresh/import jobs run on the server.
- Server refresh remains manual unless a later step adds a scheduler.
- Data Maintenance is the browser UI for server-side refresh/write actions.
- Backup should run before write-heavy maintenance.

Acceptance:

- Runbook contains daily operation commands and failure triage commands.

## Step 335.6 Verification and Closeout

Verification target:

```bash
python3 v4/scripts/server_status.py --skip-http --db <fixture-db> --data-dir <fixture-data>
python3 v4/scripts/backup_v4_data.py --db <fixture-db> --data-dir <fixture-data> --backup-dir <tmp> --restore-smoke
python3 v4/scripts/server_status.py --web-url http://192.168.1.111:8001/index.html --api-url http://192.168.1.111:8766 --db v4/data/trading_data.duckdb --data-dir v4/data
git diff --check
```

Closeout should record:

- files added;
- commands run;
- remaining manual install steps;
- suggested Step 336.

## Execution Update

Date: 2026-06-23

## Implemented

Added systemd templates:

```text
v4/deploy/systemd/v4-api.service
v4/deploy/systemd/v4-web.service
```

Added deployment runbook:

```text
v4/docs/deploy/SERVER_RUNTIME_HARDENING.md
```

Added scripts:

```text
v4/scripts/server_status.py
v4/scripts/backup_v4_data.py
```

Updated:

```text
v4/docs/planning/server_sync_inventory_runbook.md
v4/tests/test_data_freshness_scripts.py
v4/TODO.md
```

## Decisions

- systemd files are templates only. They are not installed automatically.
- The API and Web services are split into separate units so each has its own restart/status/log lifecycle.
- No cron/systemd timer is enabled in Step 335.
- `server_status.py` is read-only and can be used for daily diagnostics.
- `backup_v4_data.py` supports custom backup dirs and `--restore-smoke`.

## Verification

Ran:

```bash
python3 v4/tests/test_data_freshness_scripts.py
```

Result:

- 8 tests passed.
- New coverage includes offline `server_status.py` fixture and `backup_v4_data.py --restore-smoke` fixture.

Ran current LAN server status:

```bash
python3 v4/scripts/server_status.py \
  --web-url http://192.168.1.111:8001/index.html \
  --api-url http://192.168.1.111:8766 \
  --db v4/data/trading_data.duckdb \
  --data-dir v4/data
```

Result:

- `web_status: ok`
- `api_status: ok`
- `database_status: ok`
- `db_es_status: ok`
- `db_nq_status: ok`
- all key files present
- `hard_errors: 0`
- `server_status: ok`

Attempted a full local backup smoke:

```bash
python3 v4/scripts/backup_v4_data.py \
  --db v4/data/trading_data.duckdb \
  --data-dir v4/data \
  --backup-dir /tmp/v4-step335-backups \
  --label step335 \
  --restore-smoke
```

Result:

- Interrupted because the full `v4/data` tarball took too long in `/tmp`.
- A later `tar -tzf` check showed the interrupted tarball was incomplete.
- The invalid `/tmp/v4-step335-backups` directory was removed.
- This is not treated as a code failure because the fixture restore-smoke passed.
- For production, run the full backup during idle time against `/var/backups/trading/v4` or external storage.

## Manual Install Still Required

To install services on the server, edit paths/users in:

```text
v4/deploy/systemd/v4-api.service
v4/deploy/systemd/v4-web.service
```

Then run:

```bash
sudo cp v4/deploy/systemd/v4-api.service /etc/systemd/system/v4-api.service
sudo cp v4/deploy/systemd/v4-web.service /etc/systemd/system/v4-web.service
sudo systemctl daemon-reload
sudo systemctl enable --now v4-api.service
sudo systemctl enable --now v4-web.service
```

## Suggested Step 336

Pick one:

- Install and verify systemd services on the actual server.
- Add refresh last-run state and optional manual scheduler/timer.
- Add server-side upload import only if K-line CSV upload becomes a real requirement.
