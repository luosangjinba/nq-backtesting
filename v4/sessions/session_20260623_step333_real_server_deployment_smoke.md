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

