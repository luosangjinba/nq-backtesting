# V4 Server Runtime Hardening

Date: 2026-06-23

This document is the Step 335 operator runbook.

## Scope

These files are repo templates. Install them manually for LAN/server mode, or use `v4/deploy/install_reverse_proxy.sh` for public HTTPS reverse-proxy mode.

Do not expose `8001` or `8766` directly to the public internet. The hard gate is documented in `v4/docs/deploy/SECURITY_HARDENING_GATE.md`.

For public single-user access, prefer the reverse-proxy mode described by:

```text
v4/docs/deploy/REVERSE_PROXY_PUBLIC_ACCESS_ASSETS.md
v4/deploy/caddy/Caddyfile.template
v4/deploy/env/vps.env.example
```

In that mode, only `80/443` should be public. The static web service and API service should bind to localhost behind Caddy.

## Environment

Server `v4/.env.local` should contain:

```bash
V4_API_HOST=0.0.0.0
V4_WEB_PORT=8001
V4_TRADING_DB=/home/leo/myworkspace/trading/backtesting/v4/data/trading_data.duckdb
V4_ALLOWED_WEB_ORIGINS=http://192.168.1.111:8001
DATABENTO_API_KEY=...
```

For VPS reverse-proxy mode, use `v4/deploy/env/vps.env.example` as the starting point. The important differences are:

```bash
V4_API_HOST=127.0.0.1
V4_ALLOWED_WEB_ORIGINS=https://your-domain.example
V4_PUBLIC_DOMAIN=your-domain.example
```

`V4_ALLOWED_WEB_ORIGINS` must match the public HTTPS origin exactly. Do not include `:8001` or `:8766` in public browser URLs.

For a permanent server, replace `V4_TRADING_DB` with the chosen canonical path, for example:

```bash
V4_TRADING_DB=/var/lib/trading-data/v4/trading_data.duckdb
```

## systemd Templates

Templates:

```text
v4/deploy/systemd/v4-api.service
v4/deploy/systemd/v4-web.service
```

Before installing, edit the templates if the repo path or user is different. The API service intentionally runs from the repo root because `v4_api.py` starts maintenance scripts through `v4/scripts/...`; the web service runs from `v4/` so `index.html` and `data-maintenance.html` are served as static files.

Install:

```bash
sudo cp v4/deploy/systemd/v4-api.service /etc/systemd/system/v4-api.service
sudo cp v4/deploy/systemd/v4-web.service /etc/systemd/system/v4-web.service
sudo systemctl daemon-reload
sudo systemctl enable --now v4-api.service
sudo systemctl enable --now v4-web.service
```

Operate:

```bash
systemctl status v4-api.service
systemctl status v4-web.service
sudo systemctl restart v4-api.service
sudo systemctl restart v4-web.service
journalctl -u v4-api.service -f
journalctl -u v4-web.service -f
```

Uninstall:

```bash
sudo systemctl disable --now v4-api.service v4-web.service
sudo rm -f /etc/systemd/system/v4-api.service /etc/systemd/system/v4-web.service
sudo systemctl daemon-reload
```

## Public HTTPS Reverse Proxy

Use this mode when the same single trusted operator needs to access V4 from outside the LAN/VPN through a domain name.

Public exposure model:

- open or forward only `80/tcp` and `443/tcp` to the server;
- keep `8001/tcp` and `8766/tcp` private to localhost or a trusted LAN;
- browser entrypoint is `https://DOMAIN/index.html`;
- API entrypoint is same-origin under `https://DOMAIN/v4/...`;
- Data Maintenance remains an administrator/operator surface, not a normal user feature.

Dry-run from the repo root:

```bash
bash v4/deploy/install_reverse_proxy.sh --dry-run --domain your-domain.example
```

Apply on the server only after DNS and firewall/port-forwarding are ready:

```bash
bash v4/deploy/install_reverse_proxy.sh --apply --yes --domain your-domain.example
```

Optional ACME email and service user:

```bash
bash v4/deploy/install_reverse_proxy.sh \
  --apply \
  --yes \
  --domain your-domain.example \
  --email ops@example.com \
  --service-user leo
```

The apply path may install Caddy through `apt-get` on Debian/Ubuntu hosts or `dnf` with the official Caddy COPR on RHEL-like hosts, render `/etc/caddy/Caddyfile`, install `v4-api.service` and `v4-web.service`, restart services, and run health checks. It backs up an existing `/etc/caddy/Caddyfile` before replacing it.

Expected public checks:

```bash
curl -fsS https://your-domain.example/v4/health
curl -fsS https://your-domain.example/index.html
```

Useful local checks:

```bash
systemctl status v4-api.service v4-web.service caddy
sudo journalctl -u v4-api.service -n 80 --no-pager
sudo journalctl -u v4-web.service -n 80 --no-pager
sudo journalctl -u caddy -n 80 --no-pager
```

Rollback outline:

```bash
sudo systemctl disable --now v4-api.service v4-web.service
sudo rm -f /etc/systemd/system/v4-api.service /etc/systemd/system/v4-web.service
sudo systemctl daemon-reload
sudo cp /etc/caddy/Caddyfile.v4-backup-YYYYMMDDHHMMSS /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

This reverse-proxy path is still single-user. It does not add login, per-user authorization, public multi-user safety, or ordinary-user access to Data Maintenance.

## Status Check

Run from the repo root:

```bash
python3 v4/scripts/server_status.py \
  --web-url http://192.168.1.111:8001/index.html \
  --api-url http://192.168.1.111:8766 \
  --db v4/data/trading_data.duckdb \
  --data-dir v4/data
```

The script is read-only. It checks service reachability, DB coverage, and key data files.

## Backup

Run before write-heavy maintenance:

```bash
python3 v4/scripts/backup_v4_data.py \
  --db v4/data/trading_data.duckdb \
  --data-dir v4/data \
  --backup-dir /var/backups/trading/v4 \
  --restore-smoke
```

If `/var/backups/trading/v4` is not writable yet:

```bash
sudo mkdir -p /var/backups/trading/v4
sudo chown -R "$USER":"$USER" /var/backups/trading
```

## Daily Operation Boundary

- Client computers open `http://SERVER_HOST:8001/index.html`.
- Data Maintenance runs on `http://SERVER_HOST:8001/data-maintenance.html`.
- Refresh/write actions should run on the server only.
- Do not run refresh scripts from client machines during normal use.
- Server-backed workspace data is stored under `v4/data/users/default`; remaining histories/layout conveniences can stay device-local.
- Use Display Setup -> UI Scale for per-device screen-size adjustment.
- This runtime remains a trusted single-user LAN/VPN deployment until HTTPS/auth/CSRF/admin gates are complete.

## Manual Refresh Commands

Dry-run first:

```bash
python3 v4/scripts/daily_data_refresh.py --manual
python3 v4/scripts/verify_data_freshness.py --api-url http://127.0.0.1:8766
```

Write actions require explicit confirmation flags and should be preceded by backup.

Example confirmed writes:

```bash
python3 v4/scripts/daily_data_refresh.py --manual --write-es --write-vix --confirm-write
python3 v4/scripts/daily_databento_refresh.py --write --confirm-write --verify-api --api-url http://127.0.0.1:8766
python3 v4/scripts/update_vix_daily.py --write --confirm-write
python3 v4/scripts/update_economic_calendar.py --from-date YYYY-MM-DD --to-date YYYY-MM-DD --write --confirm-write
```
