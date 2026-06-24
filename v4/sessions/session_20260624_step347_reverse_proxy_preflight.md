# Step 347 - Real Server Reverse-Proxy Preflight

## Goal

Prepare for real public HTTPS reverse-proxy apply without mutating host system files before the real domain and external port mapping are confirmed.

Step 347.1-347.3 were executed as local/server preflight checks. Real `--apply` remains blocked until a real public domain is provided and DNS/firewall checks are confirmed.

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

## Next Steps

1. Provide the real public domain.
2. Confirm DNS points to this server public IP.
3. Confirm only `80/443` are forwarded publicly.
4. Update or stage `v4/.env.local` for public mode.
5. Run `bash v4/deploy/install_reverse_proxy.sh --dry-run --domain DOMAIN`.
6. Only then run `--apply --yes --domain DOMAIN`.
