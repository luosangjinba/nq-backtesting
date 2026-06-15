# Databento Daily Refresh

This is the guarded daily workflow for refreshing V4 futures 1-minute data from Databento.

For the current combined manual/automatic ES + VIX workflow, see
`v4/docs/user/DATA_FRESHNESS_REFRESH.md`.

Current production boundary:

- ES only.
- NQ is not write-enabled until the `NQH6 -> NQM6` roll conflict is resolved.
- The local DuckDB remains authoritative. Databento refresh is insert-only.
- The API key must be supplied through `DATABENTO_API_KEY`; do not save it in repo files.

## Dry-Run

Run this first every time:

```bash
DATABENTO_API_KEY=... python3 v4/scripts/daily_databento_refresh.py
```

Check:

- `would_insert_rows`
- `duplicate_candidate_keys`
- `existing_candidate_keys`
- `databento warnings`
- `would_insert_first_ts`
- `would_insert_last_ts`

No DB changes are made during dry-run.

## Write

Write is allowed only after the dry-run output looks correct:

```bash
DATABENTO_API_KEY=... python3 v4/scripts/daily_databento_refresh.py --write --confirm-write
```

If Databento reports degraded-condition days, the wrapper blocks write by default. To proceed after manual review:

```bash
DATABENTO_API_KEY=... python3 v4/scripts/daily_databento_refresh.py --write --confirm-write --allow-degraded
```

## API Smoke

After a successful write, verify that V4 API can read the latest ES bars:

```bash
python3 v4/scripts/verify_v4_bars_api.py --instrument ES --api-url http://127.0.0.1:8766
```

The API server must be running first. If only API verification is needed, start `v4/v4_api.py`; the web server is not required.

## Current Notes

- Databento Historical API is delayed relative to live market data and is not the live journal feed.
- Daily refresh should stay manual until several runs confirm stable behavior around Databento end time and degraded-condition warnings.
- NQ dry-run can be used for research, but NQ write remains blocked.
