# Reverse Proxy Deployment Verification

Date: 2026-06-24

Purpose: provide a focused verification checklist for Step 346 public HTTPS reverse-proxy deployment.

This checklist verifies the single-user reverse-proxy deployment path. It does not certify multi-user security.

## Before Apply

Run from the repo root:

```bash
bash v4/deploy/install_reverse_proxy.sh --dry-run --domain your-domain.example
```

Expected:

- repo path is correct;
- required Caddy/env/systemd/web/API files are present;
- Caddy route preview shows `your-domain.example`;
- route contract is `/v4/* -> 127.0.0.1:8766` and `/* -> 127.0.0.1:8001`;
- `8001` and `8766` are not listed as public ports.

Confirm externally:

- DNS `A` or `AAAA` record points to the server public IP;
- firewall or router forwards `80/tcp` and `443/tcp`;
- no public forwarding is configured for `8001/tcp` or `8766/tcp`;
- `v4/.env.local` uses `V4_API_HOST=127.0.0.1`;
- `V4_ALLOWED_WEB_ORIGINS=https://your-domain.example`.
- If public access is not IP-restricted, generate a Caddy Basic Auth hash and
  deploy with `--basic-auth-user USER --basic-auth-hash HASH`.

Do not enable Basic Auth for `--http-only` IP testing. Basic Auth credentials
must only be used over HTTPS.

## Apply

Run on the server:

```bash
bash v4/deploy/install_reverse_proxy.sh --apply --yes --domain your-domain.example
```

Recommended single-user public deployment:

```bash
caddy hash-password --plaintext 'your-strong-password'
bash v4/deploy/install_reverse_proxy.sh \
  --apply \
  --yes \
  --domain your-domain.example \
  --python-bin /usr/bin/python3.11 \
  --basic-auth-user leo \
  --basic-auth-hash '$2a$14$...'
```

The script automatically renders the correct Caddy directive name for the
installed Caddy version.

Expected:

- Caddy is installed or already available;
- `/etc/caddy/Caddyfile` is rendered with the public domain;
- an existing `/etc/caddy/Caddyfile` is backed up before replacement;
- `v4-api.service`, `v4-web.service`, and `caddy` are enabled/running;
- the script prints both health check results.

## Health Checks

Public checks:

```bash
curl -fsS https://your-domain.example/v4/health
curl -fsS https://your-domain.example/index.html
```

If Basic Auth is enabled, unauthenticated public checks should return `401`:

```bash
curl -i https://your-domain.example/v4/health
curl -i https://your-domain.example/index.html
```

Local service checks:

```bash
curl -fsS http://127.0.0.1:8766/v4/health
curl -fsS http://127.0.0.1:8001/index.html
```

Service checks:

```bash
systemctl status v4-api.service v4-web.service caddy
```

Log checks:

```bash
sudo journalctl -u v4-api.service -n 80 --no-pager
sudo journalctl -u v4-web.service -n 80 --no-pager
sudo journalctl -u caddy -n 80 --no-pager
```

## Browser Checks

Open:

```text
https://your-domain.example/index.html
https://your-domain.example/data-maintenance.html
```

Expected:

- index loads through HTTPS;
- K-line data loads through `/v4/bars`, not `:8766`;
- workspace writes continue to use the same public HTTPS origin;
- Data Maintenance loads only for the trusted operator;
- browser devtools show no mixed-content requests to `http://` public endpoints.

## Visual Acceptance Standard

Use this as the concrete pass/fail standard for the browser part of Step 347.7.

On `https://your-domain.example/index.html`:

- the address bar shows HTTPS with no browser certificate warning;
- the main V4 toolbar is visible and usable;
- the Main instrument selector shows `NQ` or `ES`;
- selecting or loading a recent range renders non-empty candlesticks on the main chart;
- changing timeframe, for example `1M` to `5M`, reloads the chart without a red API error banner;
- opening Calendar or Date Range shows the expected popover and does not blank the chart;
- opening the Inspector does not overlap the chart controls incoherently;
- browser devtools Network entries for bars use `https://your-domain.example/v4/bars...`;
- browser devtools Network entries do not call `http://your-domain.example:8766`,
  `http://your-domain.example:8001`, or any other public direct service port.

On `https://your-domain.example/data-maintenance.html`:

- the page loads through HTTPS with no certificate warning;
- Health or Status actions reach the API and return structured output;
- Economic Calendar manual import controls are visible;
- Preview actions can run without a CORS or mixed-content error;
- write actions remain gated by the explicit confirmation text.

The visual check fails if any of these are true:

- the browser shows a certificate warning;
- the page loads but the chart area is blank after a successful range load;
- K-line requests go to public `:8766` instead of same-origin `/v4/*`;
- Data Maintenance can run mutating writes without confirmation;
- browser console shows repeated API/CORS/mixed-content errors during normal load.

## Failure Triage

If `https://DOMAIN/index.html` fails:

- check DNS and `80/443` forwarding;
- check `systemctl status caddy`;
- check `journalctl -u caddy`.

If `https://DOMAIN/v4/health` fails but index loads:

- check `systemctl status v4-api.service`;
- check `journalctl -u v4-api.service`;
- confirm Caddyfile still routes `/v4/*` to `127.0.0.1:8766`.

If workspace or maintenance writes fail:

- confirm `V4_ALLOWED_WEB_ORIGINS=https://your-domain.example`;
- restart `v4-api.service`;
- retry from the public HTTPS URL, not direct ports.

## Rollback

Disable V4 services:

```bash
sudo systemctl disable --now v4-api.service v4-web.service
sudo rm -f /etc/systemd/system/v4-api.service /etc/systemd/system/v4-web.service
sudo systemctl daemon-reload
```

Restore the previous Caddyfile if the script created a backup:

```bash
sudo cp /etc/caddy/Caddyfile.v4-backup-YYYYMMDDHHMMSS /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## Security Boundary

This deployment remains single-user.

Allowed:

- one trusted operator;
- HTTPS public entry through Caddy;
- direct local API/web ports private to localhost or trusted LAN.

Not allowed:

- direct public exposure of `8001` or `8766`;
- unrelated users;
- shared accounts for different people;
- treating Data Maintenance as a normal end-user feature.
