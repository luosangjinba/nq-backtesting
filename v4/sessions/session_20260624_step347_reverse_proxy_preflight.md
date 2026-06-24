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

Current blocker:

- `trading_data.duckdb` has not been uploaded to the VPS yet.
- Upload source on local workstation: `/home/leo/myworkspace/trading/backtesting/v4/data/trading_data.duckdb`.
- Upload target on VPS: `/root/trading/backtesting/v4/data/trading_data.duckdb`.

Immediate next verification after upload:

```bash
cd /root/trading/backtesting
ls -lh v4/data/trading_data.duckdb
systemctl restart v4-api.service
curl -fsS http://43.110.32.34/v4/health
systemctl status v4-api.service v4-web.service caddy --no-pager
```

Browser smoke:

```text
http://43.110.32.34/index.html
http://43.110.32.34/data-maintenance.html
```

Important follow-up risk:

- `v4-api.service` template currently uses the Python interpreter path committed for the workstation fix. If VPS API health fails after DB upload, first check `systemctl status v4-api.service` and `journalctl -u v4-api.service -n 80 --no-pager`; the likely fixes are installing Python dependencies on VPS or making the service interpreter path configurable/detected.

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

Status: complete for static web; API/data smoke pending.

VPS command:

```bash
cd /root/trading/backtesting
git pull
bash v4/deploy/install_reverse_proxy.sh --apply --yes --domain 43.110.32.34 --http-only
```

Observed:

- Caddy install path was fixed by the `epel-8-x86_64` COPR chroot.
- User confirmed the web page is accessible at `http://43.110.32.34/`.
- DuckDB market database is not uploaded yet, so K-line loading/data maintenance have not been verified.

## Next Steps

1. Upload `trading_data.duckdb` to `/root/trading/backtesting/v4/data/trading_data.duckdb`.
2. Confirm VPS `v4/.env.local` points `V4_TRADING_DB` to that exact path and uses `V4_ALLOWED_WEB_ORIGINS=http://43.110.32.34`.
3. Restart API: `systemctl restart v4-api.service`.
4. Verify API health: `curl -fsS http://43.110.32.34/v4/health`.
5. If API fails, inspect `systemctl status v4-api.service v4-web.service caddy --no-pager` and `journalctl -u v4-api.service -n 80 --no-pager`; prioritize Python interpreter/dependency issues.
6. Browser-smoke `index.html`, K-line date range loading, and `data-maintenance.html`.
7. After IP HTTP-only data smoke passes, plan domain + HTTPS cutover.
