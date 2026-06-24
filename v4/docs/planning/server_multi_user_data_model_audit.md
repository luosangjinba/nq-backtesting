# V4 Server Multi-User Data Model Audit

Date: 2026-06-23

## Purpose

This document records a small code audit for future multi-user support while V4 is still being moved toward a single-server, single-user deployment.

The immediate goal is not to implement login or permissions. The goal is to avoid painting the server design into a corner. Single-user server mode should use a `default` user namespace conceptually, so later multi-user work can migrate data deliberately instead of rediscovering every persistence path.

## Current State Summary

V4 currently has no real user identity boundary.

The current model is:

- Server-global market data is read through `v4/v4_api.py`.
- Server maintenance actions can write server files and refresh market/calendar data.
- Most review/workspace data is browser-local `localStorage`.
- JSON archive import/export is the current manual bridge for moving review state between browsers.
- `sourceChartId` / pane metadata identifies where an object was created, but it is not a user boundary and should not become one.

Short-term server deployment solves multi-device access to one API/data source, but it does not yet solve multi-device sync for browser-local review objects.

## Data Classification

| Area | Current location | Current key/path | Future class | Multi-user treatment |
|---|---|---|---|---|
| Futures bars | DuckDB | `v4/data/trading_data.duckdb` or `V4_TRADING_DB` | global shared market data | Keep shared by default; do not duplicate per user. |
| Economic calendar | CSV | `v4/data/economic_calendar/economic_calendar_usd_events.csv` | global shared market data | Keep shared; user notes/visibility are separate. |
| VIX data | CSV | `v4/data/vix-daily.csv`, `v4/data/vix-monthly.csv` | global shared market data | Keep shared. |
| Daily regime CSVs | CSV | `v4/data/daily-regime-nq.csv`, `v4/data/daily-regime-es.csv` | mostly global derived data | Keep shared initially; user overrides would be separate later. |
| Local environment | server file | `v4/.env.local` | server/admin config | Admin-only, never per user. |
| Data refresh jobs | server scripts | `v4/scripts/update_databento_1m.py`, `daily_data_refresh.py`, etc. | server/admin operation | Admin-only. |
| PDA annotations | browser localStorage | `v4:pda-annotations:<instrument>` | user-private workspace data | Must be keyed by `user_id`; likely DB table or user workspace JSON. |
| Market segments | browser localStorage | `v4:market-segments:<instrument>` | user-private workspace data | Must be keyed by `user_id`. |
| Segment groups | browser localStorage inside segment payload | `v4:market-segments:<instrument>` | user-private workspace data | Must be keyed by `user_id`; preserve relation to segments. |
| Order setups/reviews | browser localStorage | `v4:order-reviews:<instrument>` | user-private workspace data | Must be keyed by `user_id`. |
| Live records | browser localStorage | `v4:live-records:<instrument>` | user-private workspace data | Must be keyed by `user_id`. |
| Daily time reviews | browser localStorage | `v4:daily-time-reviews:<instrument>` | user-private workspace data | Must be keyed by `user_id`. |
| Chart notes | browser localStorage | `v4:chart-notes:<instrument>` | user-private workspace data | Must be keyed by `user_id`. |
| Time overlays | browser localStorage | `v4:time-overlays:<instrument>` | user-private workspace data | Must be keyed by `user_id`. |
| Economic event notes | browser localStorage | `v4:economic-event-notes:<instrument>` | user-private overlay on global events | Must be keyed by `user_id`; event source remains global. |
| Entry context catalog | browser localStorage | `v4:entry-context-catalog` | likely user-private template/catalog | Key by `user_id`; optional future shared/admin catalog. |
| Display preferences | browser localStorage | `v4:display-preferences` | user preference | Key by `user_id`; may remain device-local until sync exists. |
| Display mode | browser localStorage | `v4:display-mode:<instrument>` | user preference | Key by `user_id`; decide whether global-to-user or device-local. |
| Primary instrument | browser localStorage | `v4:primary-instrument` | user/device preference | User preference, but can stay device-local in first server cut. |
| Pane labels | browser localStorage | `v4:chart-pane-labels` | user workspace preference | Key by `user_id`; likely workspace-level. |
| Comparison workspace | browser localStorage | `v4:comparison-window:workspace` | user workspace preference | Key by `user_id`; likely workspace-level. |
| Replay history | browser localStorage | `v4.replayHistory` | user/device workflow history | User-private; can remain device-local until workspace sync. |
| Date range history | browser localStorage | `v4.dateRangeHistory` | user/device workflow history | User-private; can remain device-local. |
| Review archive JSON | browser download/upload | generated `.json` files | user-private transfer format | Later import should stamp `user_id`; source files should be private uploads. |
| Tradovate import source files | browser selected file | no server storage currently | user-private upload/import | If serverized, store under a user-private upload namespace. |

## Server API Audit

`v4/v4_api.py` currently exposes:

- `GET /v4/health`
- `GET /v4/bars`
- `GET /v4/price`
- `GET /v4/economic_events`
- `POST /v4/data_maintenance/run`

The first four are effectively shared-data read endpoints. They can stay user-independent for the single-server phase.

`POST /v4/data_maintenance/run` is not a normal user endpoint. It can write `.env.local`, run data refresh scripts, update DuckDB/CSV data, and restart the API. In any real multi-user deployment this must be admin-only. It should not be exposed to ordinary users just because they can log in.

## Current Persistence Mechanism Observations

Most browser persistence flows already pass through small persistence modules:

- `v4/src/storage/local-persistence.js`
- `v4/src/storage/instrument-storage.js`
- `v4/src/pda/pda-persistence.js`
- `v4/src/segment/segment-persistence.js`
- `v4/src/order/order-review-persistence.js`
- `v4/src/live-record/live-record-persistence.js`
- `v4/src/time-reaction/daily-time-review-persistence.js`
- `v4/src/chart-notes/chart-note-persistence.js`
- `v4/src/time-overlays/time-overlay-persistence.js`
- `v4/src/economic-calendar/economic-event-note-persistence.js`
- `v4/src/comparison/comparison-window-persistence.js`

This is useful: future server sync can be introduced by replacing or wrapping persistence modules rather than rewriting renderers and chart interaction code first.

The current storage key structure is mostly:

```text
v4:<domain>:<instrument>
```

Future server storage should conceptually become:

```text
tenant/default-user/workspace/default/instrument/NQ/domain/pda-annotations
tenant/default-user/workspace/default/instrument/NQ/domain/order-reviews
```

The exact implementation can be relational tables or JSON documents, but the ownership fields should exist in the model.

## Recommended Future Ownership Fields

For user-private research/workspace records:

```text
user_id
workspace_id
instrument
timeframe or source_timeframe where applicable
record_id
created_at
updated_at
deleted_at or archived_at
source_chart_id / source_pane_id as metadata only
payload JSON or typed columns
```

Notes:

- `user_id` owns the data.
- `workspace_id` allows future separate workspaces without another migration.
- `instrument` remains first-class because current localStorage is instrument-scoped.
- `source_chart_id` is not security. It only records where the object was created.
- Soft delete is useful for recovery and sync conflict handling.

For shared market data:

```text
instrument
provider
contract
timestamp
timeframe
open/high/low/close/volume
import_batch_id
created_at
```

Market data should not be keyed by `user_id` unless supporting private, user-uploaded instruments.

For user-uploaded/private instruments later:

```text
owner_user_id
visibility: private | shared | admin-promoted
instrument_alias
source_file_id
```

## Migration-Friendly Single-User Rule

Use this rule while still building single-user server mode:

```text
Every user-private server record belongs to user_id = "default".
```

Even if no login screen exists, API and storage code should avoid assuming there is no owner. This can be done in later implementation by a server-side helper:

```text
current_user_id() -> "default"
```

When authentication arrives, only that helper should change first.

## Suggested Implementation Sequence

1. Keep current single-user server deployment focused on shared market data stability.
2. Add a server-side workspace persistence design using `user_id = default`, without login.
3. Migrate one low-risk domain first, such as pane labels or display preferences.
4. Migrate one core research domain, such as PDA annotations.
5. Add import/export migration from existing localStorage into the default server workspace.
6. Only after default-user server persistence is stable, add login/session handling.
7. Add admin-only protection for Data Maintenance before exposing the app beyond trusted LAN/VPN.

## Minimum Tables or Documents to Plan

If using relational tables:

```text
users(id, username, password_hash, role, created_at, disabled_at)
workspaces(id, user_id, name, created_at, updated_at)
workspace_objects(id, user_id, workspace_id, instrument, object_type, object_id, payload_json, created_at, updated_at, deleted_at)
workspace_preferences(id, user_id, workspace_id, key, payload_json, updated_at)
upload_files(id, user_id, original_name, content_hash, storage_path, visibility, created_at)
import_batches(id, user_id, source_file_id, target_kind, status, summary_json, created_at)
```

If using per-user JSON files first:

```text
data/users/default/workspaces/default/preferences.json
data/users/default/workspaces/default/instruments/NQ/pda-annotations.json
data/users/default/workspaces/default/instruments/NQ/market-segments.json
data/users/default/workspaces/default/instruments/NQ/order-reviews.json
data/users/default/uploads/
```

JSON files are simpler to start but need file locking and backup discipline. Relational storage is better once multiple users or concurrent editing are real.

## Risks Found

1. Browser-local research data is the largest multi-device gap.
   A server URL alone will not sync PDA/order/live/journal state between computers.

2. Data Maintenance is powerful.
   It currently controls refresh jobs and local environment writes. In multi-user mode it must be admin-only.

3. LocalStorage keys do not include user or workspace.
   This is acceptable for the current browser-local model, but cannot be reused as-is for multi-user server storage.

4. Archive import/export has no user ownership.
   Future server import must stamp imported objects with the current `user_id` and probably an `import_batch_id`.

5. User-uploaded K-line data needs a policy.
   Admin-promoted shared market data and private user-uploaded market data are different workflows.

## Short-Term Decisions

- Do not implement multi-user login yet.
- Do not split shared market data per user.
- Treat browser `localStorage` review data as user-private and device-local for now.
- Design any new server-side workspace persistence around `user_id = default`.
- Keep Data Maintenance as trusted-admin functionality.

## Step 343 Default Workspace Foundation

The first server-side user-private persistence foundation has been added for single-user server mode:

```text
user_id = default
workspace_id = default
storage = v4/data/users/default/workspaces/default
```

Implemented scope:

- `GET /v4/workspace?domain=display-preferences`
- `PUT /v4/workspace`
- Per-user JSON document storage with atomic replace.
- `display-preferences` as the first low-risk server-backed domain.
- localStorage remains the immediate fallback and migration source.

Current limitation:

- Conflict handling is last-write-wins.
- Only `display-preferences` is enabled.
- PDA, Segment, Order Setup, Live Record, notes, and other review objects remain browser-local until their later migration steps.

## Next Practical Step

Before coding multi-user support, choose the first persistence domain to serverize for the default user.

Recommended first domain:

```text
display/preferences or pane/workspace preferences
```

Recommended first core research domain:

```text
PDA annotations
```

PDA is a good second target because it exercises instrument-scoped user data, archive migration, renderer reload, and object ownership without touching every review subsystem at once.
