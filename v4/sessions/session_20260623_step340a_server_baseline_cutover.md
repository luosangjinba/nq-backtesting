# Step 340A - Conservative Single-User Server Baseline

## Context

Step 340 is the broader "Server runtime and canonical data cutover" step.

The conservative 340A cut keeps risk low:

- Use the current machine as the short-term server.
- Use LAN access only.
- Keep the repo-local DuckDB/data path.
- Keep the current `start.sh`/python process runtime instead of installing systemd.
- Do not migrate to `/var/lib/trading-data/v4` yet.
- Do not introduce login, multi-user permissions, or public internet exposure.

This makes the current proven LAN setup the short-term official single-user server baseline.

## Baseline Decision

Current short-term server baseline:

```text
Web URL:  http://192.168.1.111:8001/index.html
Maintenance URL: http://192.168.1.111:8001/data-maintenance.html
API URL:  http://192.168.1.111:8766
DB path:  v4/data/trading_data.duckdb
Data dir: v4/data
Access:   LAN/trusted network only
Runtime:  python3 -m http.server 8001 + python3 v4_api.py
```

This is a single-user baseline. Browser-local workspace/research data remains device-local until later server workspace persistence steps.

## Non-Goals

- No `/var/lib/trading-data/v4` migration in this substep.
- No systemd installation in this substep.
- No public exposure.
- No login or multi-user enforcement.
- No server-side workspace persistence.
- No automatic localStorage sync.

## Validation

### Listening Ports

`ss -ltnp` showed:

```text
0.0.0.0:8001 -> python3 -m http.server 8001
0.0.0.0:8766 -> python3 v4_api.py
```

### Health

```bash
curl -s http://127.0.0.1:8766/v4/health
curl -s http://192.168.1.111:8766/v4/health
```

Result:

```text
{"status": "ok", "version": "4.0"}
```

### Static Pages

```bash
curl -s -I http://192.168.1.111:8001/index.html
curl -s -I http://192.168.1.111:8001/data-maintenance.html
```

Result:

```text
HTTP 200 for both pages
```

### Server Status

Command:

```bash
python3 v4/scripts/server_status.py \
  --web-url http://192.168.1.111:8001/index.html \
  --api-url http://192.168.1.111:8766 \
  --db v4/data/trading_data.duckdb \
  --data-dir v4/data
```

Result summary:

```text
server_status: ok
web_status: ok
api_status: ok
database_status: ok
db_es_status: ok, rows=6460984, max_ts=2026-06-23 02:18:00
db_nq_status: ok, rows=6127515, max_ts=2026-06-23 02:19:00
data_dir_status: ok
hard_errors: 0
warnings: 0
```

### Bars API Spot Check

Command shape:

```bash
curl -s "http://192.168.1.111:8766/v4/bars?instrument=NQ&tf=1&start=2026-06-23%2002:00&end=2026-06-23%2002:19"
```

Result:

```text
Returned NQ 1m bars through 2026-06-23 02:19.
requestedRange matched the requested 02:00 -> 02:19 window.
```

### Economic Calendar API Spot Check

Command shape:

```bash
curl -s "http://192.168.1.111:8766/v4/economic_events?date_from=2026-06-01&date_to=2026-06-07&currency=USD&include_holidays=true"
```

Result:

```text
Returned 37 USD events for 2026-06-01 through 2026-06-07.
```

### Data Maintenance Environment Status

Command shape:

```bash
curl -s -X POST http://192.168.1.111:8766/v4/data_maintenance/run \
  -H 'Content-Type: application/json' \
  -H 'X-V4-Maintenance-Request: data-maintenance' \
  -H 'Origin: http://192.168.1.111:8001' \
  --data '{"action":"environment_status"}'
```

Result summary:

```text
ok: true
file_exists: true
DATABENTO_API_KEY: set in file and process, masked by backend
V4_TRADING_DB: set in file and process
V4_WEB_PORT: set in file and process
V4_API_HOST: set in file and process
V4_ALLOWED_WEB_ORIGINS: set in file and process
```

Do not copy `.env.local` into git. Do not record raw secrets in docs.

## Outcome

Step 340A is complete.

The conservative single-user server baseline is valid for short-term daily use on the trusted LAN:

```text
http://192.168.1.111:8001/index.html
```

## Remaining Step 340 Work

Full Step 340 remains open because these decisions are intentionally deferred:

- Move canonical data to `/var/lib/trading-data/v4`.
- Install and use systemd as the default service manager.
- Choose a long-term hostname/Tailscale name.
- Run a fresh two-device smoke after any path/service-manager change.

## Suggested Next Step

Proceed to Step 341 only if the conservative baseline is acceptable:

```text
Server maintenance and refresh ownership
```

Alternatively, if the next priority is long-term deployment hardening, complete the remaining Step 340 items first by migrating to `/var/lib/trading-data/v4` and systemd.
