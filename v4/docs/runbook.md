# V4 Operations Runbook

This is the short operational entry point for the current single-user V4
system. It links the repo-local development flow, the VPS reverse-proxy runtime,
and the data-maintenance workflows that are easy to forget under pressure.

## Current Runtime Model

- Local development repo: `/home/leo/myworkspace/trading/backtesting`
- VPS repo: `/root/trading/backtesting`
- Public URL: `https://recap.buddhiststudy.xyz/`
- Public Data Maintenance: `https://recap.buddhiststudy.xyz/data-maintenance.html`
- Public ingress: Caddy on `80/443`
- API bind target: `127.0.0.1:8766`
- Web bind target: `127.0.0.1:8001`
- Canonical VPS DuckDB: configured by `V4_TRADING_DB` in `v4/.env.local`
- Data Maintenance is trusted-admin functionality.

Keep API and web services bound to localhost on the VPS. Public browser traffic
should go through Caddy, including `/v4/*`.

## Pull And Restart On VPS

```bash
cd /root/trading/backtesting
git pull origin step-server-data-model-audit
systemctl restart v4-api.service
systemctl restart v4-web.service
```

Static-only changes usually do not require an API restart, but restarting after
API/Data Maintenance changes keeps the deployed behavior explicit.

## Health Checks

VPS:

```bash
curl -fsS https://recap.buddhiststudy.xyz/v4/health
systemctl status v4-api.service --no-pager
systemctl status v4-web.service --no-pager
systemctl status caddy --no-pager
```

Local repo smoke:

```bash
python3 v4/scripts/smoke_all.py
```

Running local API/web smoke:

```bash
python3 v4/scripts/smoke_all.py --suite api
```

VPS API smoke from the VPS:

```bash
python3 v4/scripts/smoke_all.py \
  --suite api \
  --api-url http://127.0.0.1:8766 \
  --web-url http://127.0.0.1:8001/index.html
```

Public smoke from any machine with access:

```bash
python3 v4/scripts/smoke_all.py \
  --suite api \
  --api-url https://recap.buddhiststudy.xyz \
  --web-url https://recap.buddhiststudy.xyz/index.html
```

## 502 / API Down Triage

If the browser shows `HTTP 502` or K-lines fail to load:

```bash
systemctl status v4-api.service --no-pager -l
journalctl -u v4-api.service -n 120 --no-pager
curl -v http://127.0.0.1:8766/v4/health
ss -ltnp | grep -E '(:8766|:8001|:80|:443)'
```

Common cause: `status=203/EXEC` means systemd could not execute the Python path
in `ExecStart`. Check:

```bash
cat /etc/systemd/system/v4-api.service
which python3.11
```

Then re-apply the deploy script with the correct Python:

```bash
bash v4/deploy/install_reverse_proxy.sh \
  --apply \
  --yes \
  --domain recap.buddhiststudy.xyz \
  --email dayong7805@outlook.com \
  --service-user root \
  --python-bin /usr/bin/python3.11
```

## Economic Calendar Workflow

VPS automatic ForexFactory fetch is unreliable because Cloudflare may serve a
Turnstile challenge to headless Chrome. Preferred production flow:

1. Let the local weekly cron export next week's CSV.
2. Open `https://recap.buddhiststudy.xyz/data-maintenance.html`.
3. Choose the generated `economic_manual_usd_YYYY-MM-DD_YYYY-MM-DD.csv`.
4. Keep `Currency=USD` and `Timezone=America/New_York`.
5. Run `Preview Manual CSV`.
6. If `would_append_rows` looks correct, type `WRITE ECONOMIC`.
7. Run `Write Manual CSV`.
8. Run `Economic Verify`.

Local weekly export script:

```bash
python3 v4/scripts/export_weekly_economic_manual_csv.py
```

Current cron pattern:

```cron
0 9 * * 6 cd /home/leo/myworkspace/trading/backtesting && /home/leo/miniconda3/bin/python3 v4/scripts/export_weekly_economic_manual_csv.py >> v4/data/economic_calendar/manual_import_exports/cron.log 2>&1
```

Check cron:

```bash
crontab -l
tail -100 v4/data/economic_calendar/manual_import_exports/cron.log
```

## Backup And Write Rule

Before any real Data Maintenance write:

- Identify the latest usable backup.
- Run the dry-run or preview action first.
- Confirm the action-specific confirmation text.
- Keep generated backups outside Git.

Economic manual imports back up the existing CSV before appending. DuckDB and
large runtime data are not committed to Git.

## Security Boundary

The current public deployment is single-user and protected by reverse proxy
controls. Before allowing additional users, finish the gates in:

- `v4/docs/deploy/SECURITY_HARDENING_GATE.md`
- `v4/docs/planning/multi_user_login_readiness_review.md`

Do not expose `8766` or `8001` directly to the public internet.

## References

- `v4/docs/deploy/SERVER_RUNTIME_HARDENING.md`
- `v4/docs/deploy/REVERSE_PROXY_DEPLOYMENT_VERIFICATION.md`
- `v4/docs/planning/server_sync_inventory_runbook.md`
- `v4/docs/user/DATA_MAINTENANCE_PAGE.zh-CN.md`
- `v4/docs/user/ECONOMIC_CALENDAR_REFRESH.zh-CN.md`
