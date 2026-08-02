# Session — 2026-08-02 — NQ 2025 Roll Liquidity Audit

## Request

Determine whether Databento can be the continuous-contract authority and audit
the user's observation that the current 2025 NQ boundaries select illiquid new
contracts too early.

## Result

- performed a read-only four-window Databento raw-contract scan;
- resolved the complete 2025 `NQ.v.0` instrument mapping;
- proved direct `NQ.v.0` switches at `00:00 UTC`, splitting CME sessions at
  `20:00`/`19:00` New York;
- confirmed March and June current boundaries select new contracts at only
  8.74% and 11.31% of old-contract volume with visible missing minutes;
- retained raw quarterly acquisition plus the existing two-complete-session,
  session-aligned R7.3c policy;
- after enforcing the existing expiry-week hard horizon, identified effective
  boundaries at 2025-03-16 18:00, 2025-06-15 18:00, retained
  2025-09-14 18:00, and 2025-12-14 18:00 ET;
- bounded a future historical repair to 2,262 current rows replaced by 2,400
  raw-source rows, restoring 138 minute timestamps;
- recorded that Databento marks 2025-09-17 `degraded`, so it cannot count as
  automatic confirmation evidence.

No DuckDB, calendar, service, or market-data row was changed.

## Binding Evidence

- `v7/docs/V7_NQ_2025_ROLL_LIQUIDITY_AUDIT.md`
- `v4/scripts/scan_roll_volume_candidates.py`
- Databento `GLBX.MDP3` `ohlcv-1m` raw/continuous read-only API responses
- read-only `/home/leo/myworkspace/trading/backtesting/v4/data/trading_data.duckdb`
  coverage queries

## Continuation

Completed in
`v7/sessions/session_20260802_nq_2025_historical_roll_repair.md`. The ordinary
insert-only updater and R7.3c historical-repair rejection remain unchanged.
