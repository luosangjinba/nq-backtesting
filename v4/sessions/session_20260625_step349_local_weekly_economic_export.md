# Step 349 - Local Weekly Economic Calendar Manual Export

## Goal

ForexFactory can be fetched successfully from the local machine, while the VPS
headless path is blocked by Cloudflare Turnstile. Add a local, API-independent
weekly export script that can be scheduled by cron and produces the manual CSV
accepted by recap Data Maintenance.

## Design

- Script: `v4/scripts/export_weekly_economic_manual_csv.py`
- Default range: next Monday through next Sunday.
- Default output:
  `v4/data/economic_calendar/manual_import_exports/economic_manual_usd_YYYY-MM-DD_YYYY-MM-DD.csv`
- Manual schema:
  `Title,Country,Date,Time,Impact,Forecast,Previous,URL`
- The script reuses `update_economic_calendar.py` fetching and conversion logic.
- It does not write `economic_calendar_usd_events.csv`.
- Server writes still happen only through recap manual preview/write.

## Cron Example

```bash
0 9 * * 6 cd /home/leo/myworkspace/trading/backtesting && /usr/bin/python3 v4/scripts/export_weekly_economic_manual_csv.py >> v4/data/economic_calendar/manual_import_exports/cron.log 2>&1
```

Use `python3.11` or the project conda Python if that is the interpreter with
Selenium/Chrome dependencies installed.

## Verification

```text
python3 v4/tests/economic-weekly-manual-export-smoke.py
python3 -m py_compile v4/scripts/export_weekly_economic_manual_csv.py
git diff --check
```
