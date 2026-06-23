# Session: Step 333 Real Server Deployment Smoke

Date: 2026-06-23

## Goal

Run the V4 server-centered baseline on a real server and prove that multiple devices can use the same V4 data source through one server URL.

This step is not full workspace sync. Browser `localStorage` state remains device-local unless a later step explicitly moves it server-side.

## Preconditions

- Step 332 is committed.
- The server can run Python, Node, and the existing V4 scripts.
- A trusted network path exists from client devices to the server. Short-term preference: Tailscale or trusted LAN, not public internet.
- A canonical data path is chosen for `trading_data.duckdb` and V4 data files.

## Step 333.1 Server Identity and Access Decision

Decide and record:

- Server hostname/IP.
- Access mode: Tailscale, trusted LAN, or public HTTPS behind a reverse proxy.
- Client URL, expected shape:

```text
http://SERVER_HOST:8001/index.html
```

- API URL, expected shape:

```text
http://SERVER_HOST:8766/v4/health
```

- Allowed origins for Data Maintenance:

```text
http://SERVER_HOST:8001
http://TAILSCALE_IP:8001
```

- Canonical data path, recommended:

```text
/var/lib/trading-data/v4/trading_data.duckdb
```

Acceptance:

- Final server URL and API URL are written in the runbook or session closeout.
- The access mode is explicit enough that firewall/security decisions are not ambiguous.

## Step 333.2 Runtime Environment Bootstrap

On the server:

```bash
git clone <repo-url>
cd backtesting
```

Configure `v4/.env.local`:

```bash
V4_API_HOST=0.0.0.0
V4_WEB_PORT=8001
V4_TRADING_DB=/var/lib/trading-data/v4/trading_data.duckdb
V4_ALLOWED_WEB_ORIGINS=http://SERVER_HOST:8001,http://TAILSCALE_IP:8001
DATABENTO_API_KEY=...
```

Confirm dependencies:

```bash
python3 --version
node --version
python3 -c "import duckdb; print('duckdb ok')"
```

Acceptance:

- Repo is present on the server.
- `v4/.env.local` exists on the server and is not committed.
- Python/Node/DuckDB dependencies are available.

## Step 333.3 Canonical Data Migration and Ownership

Create server data directory:

```bash
sudo mkdir -p /var/lib/trading-data/v4
sudo chown -R "$USER":"$USER" /var/lib/trading-data
```

Copy current trusted data to the server canonical location:

- `trading_data.duckdb`
- `economic_calendar/economic_calendar_usd_events.csv`
- `vix-daily.csv`
- `vix-monthly.csv`
- `daily-regime-nq.csv`
- `daily-regime-es.csv`

Daily refresh/import ownership:

- Run normal refresh jobs only on the server.
- Client machines should not run daily refresh/import jobs during normal use.

Acceptance:

- API reads bars from `V4_TRADING_DB`.
- Calendar/VIX/regime files are available from the server repo/data path or documented server data path.
- Ownership rule is documented: server is canonical; clients are viewers/operators.

## Step 333.4 Server Start and Single-Client Smoke

Start V4:

```bash
bash v4/start.sh start
```

Health checks:

```bash
curl -s http://127.0.0.1:8766/v4/health
curl -s http://SERVER_HOST:8766/v4/health
curl -s -I http://SERVER_HOST:8001/index.html
curl -s -I http://SERVER_HOST:8001/data-maintenance.html
```

Browser checks from one client:

- Open `http://SERVER_HOST:8001/index.html`.
- Confirm Main chart loads bars.
- Open DevTools Network and confirm API requests go to `SERVER_HOST:8766`.
- Open `http://SERVER_HOST:8001/data-maintenance.html`.
- Confirm Data Maintenance POST is accepted from the configured origin.

Acceptance:

- Server-local and remote health checks pass.
- One remote client can render bars.
- Data Maintenance origin allowlist works for the chosen server URL.

## Step 333.5 Two-Device Consistency Smoke

On device A and device B:

- Open the same server URL.
- Select the same instrument/timeframe/date range.
- Compare latest bar timestamp/date.
- Compare calendar visible events for the same selected date.
- Compare VIX/regime-derived display where applicable.
- Confirm Network requests on both devices target the server API host, not each device's `127.0.0.1`.

Acceptance:

- Both devices show the same latest market/calendar data after reload.
- Any differences are identified as browser-local UI/workspace state, not data-source divergence.

## Step 333.6 Backup, Operations Note, and Closeout

Run one backup:

```bash
mkdir -p /var/backups/trading/v4
cp /var/lib/trading-data/v4/trading_data.duckdb /var/backups/trading/v4/trading_data.$(date +%Y%m%d_%H%M%S).duckdb
tar -czf /var/backups/trading/v4/v4-data.$(date +%Y%m%d_%H%M%S).tar.gz -C /var/lib/trading-data v4
```

Run a temporary restore check:

```bash
mkdir -p /tmp/v4-restore-test
tar -xzf /var/backups/trading/v4/v4-data.YYYYMMDD_HHMMSS.tar.gz -C /tmp/v4-restore-test
ls -lh /tmp/v4-restore-test/v4
```

Closeout should record:

- Final server URL.
- Start/stop/restart commands.
- Refresh/import commands that are allowed on the server.
- Backup location and restore check result.
- Device-local state that is still not synced.
- Follow-up Step 334 recommendation.

## Likely Step 334 Candidates

Pick based on what Step 333 reveals:

- Server refresh/import automation if data freshness is the biggest remaining issue.
- Systemd service and log rotation if runtime stability is the biggest remaining issue.
- Workspace/localStorage server sync if cross-device UI state is the biggest remaining issue.
- Reverse proxy/HTTPS/auth if access must leave a private network.

## Execution Update: Local Server Baseline Smoke

Date: 2026-06-23

### Server Identity

Chosen short-term server endpoint for this smoke:

```text
Web: http://192.168.1.111:8001/index.html
API: http://192.168.1.111:8766
Data Maintenance: http://192.168.1.111:8001/data-maintenance.html
```

Access mode:

- Trusted LAN for the current smoke.
- Public internet exposure is still out of scope.

### Local Environment

Updated ignored machine-local `v4/.env.local` with:

```bash
V4_API_HOST=0.0.0.0
V4_WEB_PORT=8001
V4_TRADING_DB=/home/leo/myworkspace/trading/backtesting/v4/data/trading_data.duckdb
V4_ALLOWED_WEB_ORIGINS=http://127.0.0.1:8001,http://localhost:8001,http://192.168.1.111:8001
```

The secret API key remains in `v4/.env.local` and is not committed.

### Runtime Checks

API was restarted with:

```bash
bash v4/start.sh restart
```

Listener check:

```text
0.0.0.0:8001 - static web server
0.0.0.0:8766 - V4 API
```

Health/page checks passed:

```bash
curl -s http://127.0.0.1:8766/v4/health
curl -s http://192.168.1.111:8766/v4/health
curl -s -I http://192.168.1.111:8001/index.html
curl -s -I http://192.168.1.111:8001/data-maintenance.html
```

Observed health response:

```json
{"status": "ok", "version": "4.0"}
```

### Data Checks

Canonical smoke data source:

```text
v4/data/trading_data.duckdb
```

Key files verified:

- `v4/data/trading_data.duckdb`
- `v4/data/economic_calendar/economic_calendar_usd_events.csv`
- `v4/data/vix-daily.csv`
- `v4/data/vix-monthly.csv`
- `v4/data/daily-regime-nq.csv`
- `v4/data/daily-regime-es.csv`

Remote API data checks passed:

```bash
curl -s "http://192.168.1.111:8766/v4/bars?start=2026-06-19%2000:00&end=2026-06-19%2023:59&tf=60&instrument=NQ"
curl -s "http://192.168.1.111:8766/v4/economic_events?date_from=2026-06-19&date_to=2026-06-19"
```

Bars returned real NQ data. Economic events returned the 2026-06-19 USD bank holiday event.

### Browser API Host Smoke

Created an ignored temporary browser smoke at:

```text
tmp/step333_server_browser_smoke.js
```

Ran:

```bash
node tmp/step333_server_browser_smoke.js
```

Result:

- Page loaded from `http://192.168.1.111:8001/index.html`.
- Browser-side `fetchBars()` called `http://192.168.1.111:8766/v4/bars?...`.
- It did not call `http://127.0.0.1:8766`.
- API returned 31 bars for the smoke range.

### Data Maintenance Origin Check

Allowed origin preflight passed:

```bash
curl -s -i -X OPTIONS \
  -H "Origin: http://192.168.1.111:8001" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: X-V4-Maintenance-Request, Content-Type" \
  http://192.168.1.111:8766/v4/data_maintenance/run
```

The response included:

```text
Access-Control-Allow-Origin: http://192.168.1.111:8001
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-V4-Maintenance-Request
```

Unlisted origin preflight returned no allow-origin header.

### Backup and Restore Smoke

Backup location used for this local smoke:

```text
/tmp/v4-step333-backups
```

Created:

- `/tmp/v4-step333-backups/trading_data.step333.duckdb`
- `/tmp/v4-step333-backups/v4-data.step333.tar.gz`

Restore test location:

```text
/tmp/v4-step333-restore-test
```

Restore check confirmed the extracted data directory contains:

- `trading_data.duckdb`
- `economic_calendar/economic_calendar_usd_events.csv`
- `vix-daily.csv`
- `vix-monthly.csv`
- `daily-regime-nq.csv`
- `daily-regime-es.csv`

For a long-running server, move backup output to `/var/backups/trading/v4` or external storage instead of `/tmp`.

### Remote Device Feedback

The user confirmed that another computer can open:

```text
http://192.168.1.111:8001/index.html
```

This closes the Step 333 server URL baseline.

Follow-up issues found during that remote check:

- K-line data import cannot be completed from the remote computer.
- The UI does not show a useful error message for the failed import.
- The app does not adapt well to different screen resolutions.

These are not treated as Step 333 blockers because the server URL/API baseline is proven. They are moved to Step 334: Remote Data Maintenance and responsive UX hardening.
