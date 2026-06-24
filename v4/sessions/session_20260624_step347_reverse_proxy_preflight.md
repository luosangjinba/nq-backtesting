# Step 347 - Real VPS Reverse-Proxy Rollout

## Goal

Move V4 from LAN/local hosting toward a real VPS deployment. The current rollout path is:

1. Use public IP + HTTP-only mode first, because IP addresses cannot use normal Let's Encrypt HTTPS certificates.
2. Confirm Caddy -> static web -> API routing on the VPS.
3. Upload the canonical DuckDB market database and verify K-line/data-maintenance behavior.
4. Cut over to a domain + HTTPS later after the IP-mode smoke is stable.

## Current Handoff - 2026-06-24

Repo/branch:

```text
local repo: /home/leo/myworkspace/trading/backtesting
branch: step-server-data-model-audit
latest deployment-code commit on VPS/GitHub: 7916351 Fix Caddy COPR chroot on Alibaba Linux
latest local handoff commit: Record VPS HTTP-only deployment handoff
GitHub repo: https://github.com/luosangjinba/nq-backtesting.git
```

VPS:

```text
OS: Alibaba Cloud Linux 3 / OpenAnolis
repo path: /root/trading/backtesting
public IP: 43.110.32.34
current deploy mode: HTTP-only public IP diagnostic
public URL: http://43.110.32.34/
```

Known VPS progress:

- VPS clone was switched from `main` to `step-server-data-model-audit`.
- Initial `dnf copr enable -y @caddy/caddy` failed because Alibaba Cloud Linux 3 was detected as nonexistent `epel-3-x86_64`.
- Commit `7916351` fixed this by detecting `PLATFORM_ID=platform:al8` and enabling Caddy COPR with `epel-8-x86_64`.
- User reran the HTTP-only apply after pulling the fix and confirmed the web page is accessible.
- `trading_data.duckdb` has been uploaded/confirmed at `/root/trading/backtesting/v4/data/trading_data.duckdb`.
- `v4-api.service` was fixed to use VPS Python 3.11 (`/usr/bin/python3.11`) instead of the workstation-only `/home/leo/miniconda3/bin/python3`.
- Public `/v4/health` and `/v4/bars` now work through Caddy at `http://43.110.32.34/v4/...`.

Expected VPS `.env.local` shape for current IP-mode smoke:

```bash
V4_PUBLIC_DOMAIN=43.110.32.34
V4_API_HOST=127.0.0.1
V4_WEB_HOST=127.0.0.1
V4_WEB_PORT=8001
V4_ALLOWED_WEB_ORIGINS=http://43.110.32.34
V4_TRADING_DB=/root/trading/backtesting/v4/data/trading_data.duckdb
DATABENTO_API_KEY=<set on VPS if refresh actions are needed>
```

Current status:

- Step 347.6 API/data smoke is complete for the IP HTTP-only diagnostic deployment.
- Browser/static web, API health, bars API via Caddy, and date range history workspace sync have been verified enough to move to real browser usage checks.

Useful verification commands:

```bash
cd /root/trading/backtesting
ls -lh v4/data/trading_data.duckdb
curl -fsS http://43.110.32.34/v4/health
curl -fsS "http://43.110.32.34/v4/bars?instrument=ES&start=2025-06-01+00:00&end=2025-06-20+16:00&tf=1440"
curl -fsS "http://43.110.32.34/v4/workspace?domain=date-range-history"
systemctl status v4-api.service v4-web.service caddy --no-pager
```

Browser smoke:

```text
http://43.110.32.34/index.html
http://43.110.32.34/data-maintenance.html
```

Important follow-up risk:

- The repo systemd template still contains workstation-oriented defaults. The VPS-installed service has been manually fixed, but a future deploy-script run could overwrite it unless the template/script is made path/interpreter configurable.
- The Databento key was shared in chat during setup. Treat it as exposed; rotate/revoke if it has production value.

## Step 347.1 - Server Exposure Precheck

Status: complete with blockers recorded.

Commands:

```text
ss -ltnp
curl -s -I http://127.0.0.1:8001/index.html
curl -s -I http://127.0.0.1:8001/data-maintenance.html
curl -s http://127.0.0.1:8766/v4/health
command -v caddy || true
```

Observed:

- `8001` is listening on `0.0.0.0`.
- `8766` is listening on `0.0.0.0`.
- `80` is listening on this host.
- Caddy is not installed.
- `index.html` returns 200 from local web service.
- `data-maintenance.html` returns 200 from local web service.
- API health is `{"status": "ok", "version": "4.0"}` at `/v4/health`.

Conclusion:

- Current machine is still in LAN server mode, not public reverse-proxy mode.
- Before public apply, `8001/8766` should be private to localhost or trusted LAN, and public access should go through `80/443` via Caddy.
- DNS and external port mapping could not be verified because no real domain was provided in this step.

## Step 347.2 - Public-Mode Env Readiness Check

Status: complete with blockers recorded.

Command:

```text
rg -n "^V4_" v4/.env.local v4/deploy/env/vps.env.example
```

Current `v4/.env.local` V4 values:

```bash
V4_API_HOST=0.0.0.0
V4_WEB_PORT=8001
V4_TRADING_DB=/home/leo/myworkspace/trading/backtesting/v4/data/trading_data.duckdb
V4_ALLOWED_WEB_ORIGINS=http://127.0.0.1:8001,http://localhost:8001,http://192.168.1.111:8001
```

Public reverse-proxy mode should use:

```bash
V4_PUBLIC_DOMAIN=your-domain.example
V4_API_HOST=127.0.0.1
V4_WEB_PORT=8001
V4_ALLOWED_WEB_ORIGINS=https://your-domain.example
V4_TRADING_DB=/home/leo/myworkspace/trading/backtesting/v4/data/trading_data.duckdb
```

Conclusion:

- Current env is correct for LAN mode.
- It is not ready for public reverse-proxy apply.
- Do not apply until `DOMAIN` is known and `.env.local` is adjusted or staged for public mode.

## Step 347.3 - Reverse-Proxy Dry-Run Smoke

Status: complete.

Command:

```text
bash v4/deploy/install_reverse_proxy.sh --dry-run --domain example.com
```

Observed:

- required repo files are present;
- `systemctl` is available;
- `sudo` exists but non-interactive sudo is not available;
- Caddy is not installed;
- route preview renders `example.com`;
- planned route is `/v4/* -> 127.0.0.1:8766` and `/* -> 127.0.0.1:8001`;
- planned health checks are `https://example.com/v4/health` and `https://example.com/index.html`;
- dry-run completed without host writes.

Additional correction:

- Fixed `v4/docs/deploy/REVERSE_PROXY_DEPLOYMENT_VERIFICATION.md` local health check from `http://127.0.0.1:8766/health` to `http://127.0.0.1:8766/v4/health`.

## Step 347.4 - RHEL-Like VPS Deploy Compatibility

Status: complete.

Observed on VPS:

```text
NAME="Alibaba Cloud Linux"
VERSION="3 (OpenAnolis Edition)"
ID="alinux"
ID_LIKE="rhel fedora centos anolis"
PLATFORM_ID="platform:al8"
```

Initial apply failed at:

```text
dnf copr enable -y @caddy/caddy
Repository 'epel-3-x86_64' does not exist in project '@caddy/caddy'.
```

Fix:

- Added RHEL-like Caddy install support to `v4/deploy/install_reverse_proxy.sh`.
- Added COPR chroot detection for `platform:al8`, `platform:el8`, `platform:al9`, `platform:el9`, and `platform:el10`.
- Alibaba Cloud Linux 3 now runs:

```bash
dnf copr enable -y @caddy/caddy epel-8-x86_64
```

Commit:

```text
7916351 Fix Caddy COPR chroot on Alibaba Linux
```

## Step 347.5 - VPS IP HTTP-Only Apply And Static Web Smoke

Status: complete.

VPS command:

```bash
cd /root/trading/backtesting
git pull
bash v4/deploy/install_reverse_proxy.sh --apply --yes --domain 43.110.32.34 --http-only
```

Observed:

- Caddy install path was fixed by the `epel-8-x86_64` COPR chroot.
- User confirmed the web page is accessible at `http://43.110.32.34/`.
- DuckDB/API/data smoke was completed later in Step 347.6.

## Step 347.6 - Upload DuckDB And API/Data Smoke

Status: complete for IP HTTP-only diagnostic deployment.

Observed failure:

```text
curl -fsS http://43.110.32.34/v4/health
curl: (22) The requested URL returned error: 502 Bad Gateway
```

Root cause:

```text
ExecStart=/home/leo/miniconda3/bin/python3 /root/trading/backtesting/v4/v4_api.py
status=203/EXEC
```

The installed `v4-api.service` used the workstation Python path. On the VPS, default `python3` is `3.6.8`, but `/usr/bin/python3.11` exists and is the intended runtime.

Service fix applied on VPS:

```bash
systemctl stop v4-api.service
sed -i 's|/home/leo/miniconda3/bin/python3|/usr/bin/python3.11|g' /etc/systemd/system/v4-api.service
cd /root/trading/backtesting
/usr/bin/python3.11 -m pip install -r v4/requirements-data.txt
systemctl daemon-reload
systemctl restart v4-api.service
```

Frontend API routing issue:

- `src/config.js` previously returned `${protocol}//${hostname}:8766` for every hostname.
- Public browsers at `http://43.110.32.34/` tried to call `http://43.110.32.34:8766/v4/...`, but `8766` is intentionally private.
- Commit `a6077c9 Route public API calls through reverse proxy` changed `resolveApiBase()` so `localhost` / `127.0.0.1` keep local dev direct `:8766`, while non-local hosts use same-origin `/v4/*` through Caddy.

Verified:

```bash
curl -fsS http://43.110.32.34/v4/health
curl -fsS "http://43.110.32.34/v4/bars?instrument=ES&start=2025-06-01+00:00&end=2025-06-20+16:00&tf=1440"
curl -I http://43.110.32.34/index.html
```

The `/v4/bars` smoke returned ES daily bars through the public Caddy route.

Workspace sync follow-up:

- Commit `41feb39 Sync date range history through workspace` added `date-range-history` as a workspace-scoped server domain.
- Date Range History Ranges now keep localStorage fallback (`v4.dateRangeHistory`) but sync through `/v4/workspace?domain=date-range-history`.
- User verified cross-device history range sync after pulling/restarting.

Local verification before push:

```text
node v4/tests/api-base-smoke.js
node v4/tests/date-range-history-workspace-smoke.js
python3 v4/tests/workspace-api-smoke.py
node v4/tests/notes-review-domains-persistence-smoke.js
node --check v4/src/ui/calendar-navigator.js
python3 -m py_compile v4/v4_api.py
git diff --check
```

## Next Steps

1. Do a focused two-device real browser smoke at `http://43.110.32.34/`: K-line loading, History Ranges sync, PDA/Segment/Order Setup server workspace sync, and `data-maintenance.html` visibility.
2. Harden the deploy script/systemd template so VPS repo path, service user, and Python interpreter are configurable, preventing future apply runs from restoring workstation paths.
3. After IP HTTP-only real-use smoke remains stable, plan Step 347.7 domain + HTTPS cutover.
