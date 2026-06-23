# V4 Server-Centered Multi-Device Sync Plan

Date: 2026-06-22

## Goal

Let multiple computers use the same V4 data by centralizing the runtime data source on one server. The short-term goal is not full cloud workspace sync; it is to stop the most expensive divergence: market data, imported data, review records, and API responses drifting between machines.

## Principle

Deploying the web page alone is not enough. The server must own the canonical API, database, and import output. Browser-local state can stay local in the short term, but it must be treated as device-local until later workspace sync work is implemented.

## Short-Term Scope

In scope:

- One server runs the V4 API.
- One server-side database or data directory is canonical.
- Every computer opens the same server-hosted V4 URL.
- Data refresh/import jobs run on the server, not independently on each laptop/desktop.
- The client is configured to call the server API instead of localhost.
- A backup/restore path exists before real usage.

Out of scope for the first pass:

- Login/multi-user permissions.
- Full `localStorage` workspace sync.
- Conflict resolution between simultaneously edited workspaces.
- Offline editing and later merge.
- Realtime collaboration.

## Phase 1: Inventory Current Persistence

Purpose: identify what must move to the server and what can remain device-local.

Tasks:

- List API processes and ports currently needed for V4, including bars API, price lookup, and any maintenance endpoints.
- List storage locations:
  - Postgres databases.
  - CSV/data folders.
  - imported Tradovate/live record outputs.
  - economic calendar files.
  - daily regime/VIX files.
  - Review/Journal/Replay persistence that is file or DB backed.
- List browser-local keys that will remain local for now:
  - display preferences;
  - Comparison Window workspace;
  - Replay History;
  - any `localStorage`-only UI state.
- Decide the initial canonical server path and database name.

Deliverable:

- A short inventory document with each persistence item marked as `server-canonical`, `client-local-for-now`, or `unknown`.

Status:

- Completed as local preparation in `v4/docs/planning/server_sync_inventory_runbook.md`.
- Real deployment still needs the actual server hostname/IP and canonical data path.

## Phase 2: Server Runtime Baseline

Purpose: make one server run the same V4 app and API reliably.

Tasks:

- Provision the server with the same Python/Node/Postgres/runtime dependencies.
- Clone the repo on the server.
- Start V4 through the existing `v4/start.sh` flow or a small systemd service wrapper.
- Confirm API health endpoints from the server itself.
- Confirm the browser can load `http(s)://server/.../v4/index.html`.
- Confirm one client computer can load bars and render the chart from the server.

Deliverable:

- Server URL.
- Start/stop/restart commands.
- Health check commands.

Status:

- Client/API code now supports opening V4 from a remote server hostname.
- Real server runtime smoke is pending actual server access.

## Phase 3: Centralize Data Refresh and Imports

Purpose: prevent different computers from independently creating different data.

Tasks:

- Move data refresh jobs to the server:
  - candle data refresh;
  - economic calendar refresh;
  - VIX/daily regime refresh;
  - any scheduled maintenance jobs.
- Disable or avoid running those refresh jobs from client machines unless explicitly debugging.
- Put imported files through server-side import flows where possible.
- Confirm refreshed data appears identically from two different computers.

Deliverable:

- Server-owned refresh/import checklist.
- Manual runbook for each refresh/import job.

## Phase 4: Backups Before Daily Use

Purpose: make centralized data safer than scattered local data.

Tasks:

- Add a backup command or runbook for:
  - Postgres dump;
  - server data directory archive;
  - imported raw/source files if they are not in DB.
- Store backups outside the server data directory.
- Test one restore into a temporary database or temporary folder.
- Define backup cadence.

Deliverable:

- Backup command.
- Restore test command.
- Backup location.

## Phase 5: Client Configuration and Usage Rules

Purpose: make daily multi-device usage predictable.

Tasks:

- Decide the production V4 URL all computers should use.
- Document that users should not open separate local V4 instances for normal work.
- Document which state is still device-local:
  - layout/display preferences;
  - Comparison Window workspace;
  - Replay History;
  - any other browser-local state found in Phase 1.
- Confirm two devices see the same server data after a reload.

Deliverable:

- One short operation note: "How to use V4 from multiple computers."

## Recommended First Implementation Cut

Do these first:

1. Server runs V4 API and static files.
2. Server owns Postgres/data folders.
3. Client computers only browse the server URL.
4. Backups exist.

This gives the biggest synchronization win without first redesigning browser workspace persistence.

## Future Backlog

These ideas should be implemented later, after the server baseline is stable:

- Server-side workspace state:
  - Comparison Window state;
  - Replay History;
  - display preferences;
  - visible calendar/Inspector state.
- Workspace profile IDs so a user can intentionally switch between setups.
- Authentication before exposing the server outside a private network.
- HTTPS and reverse proxy hardening.
- Import audit log showing when and from which source data was imported.
- Server-side raw import archive for Tradovate and other uploaded files.
- Conflict detection for edits from two devices.
- Full database-backed Review/Journal state if any part is still local-only.
- Optional sync/export endpoint for localStorage migration into server workspace state.
- Monitoring for API health, disk usage, database size, and failed refresh jobs.
