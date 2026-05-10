# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NQ futures ICT (Inner Circle Trader) backtesting system. A single-user, local-only research tool studying the 9:30-10:30 NY Open window. Core goal: build statistical samples of pre-market conditions and post-open opportunities, not a trading journal.

**First principle: time is the primary variable** — what happens at what time matters more than what price it happens at. All fields and logic should emphasize time structure over price results.

## Architecture

Three-layer data model:

- **Layer 0**: Raw 1-minute OHLCV in `trading_data.duckdb` (`futures_1m` table)
- **Layer 1**: Mechanical PDA (Price Delivery Area) scanning — auto-detected from price data. Types: `bsl, ssl, fvg, nwog, ndog, daily_high, daily_low, ict_midnight_day_high, ict_midnight_day_low, eqh, eql`
- **Layer 1.5**: Reference groups — identity groups linking the same price/time across PDA types
- **Layer 2**: Human-curated structure paths, manual PDA entry. YAML files are the truth source; DuckDB is the query/statistics layer.

Backend: `price_lookup_api.py` — a ThreadingHTTPServer on port 8765 connecting to both DuckDB databases. All config comes from `v2/v2_config.yaml`.

Frontend: Self-contained HTML files (React-based, local vendor JS) communicating with the Python API:
- `kline_viewer.html` — K-line chart with PDA overlay and right-side PDA workbench (active development focus)
- `layer2_recorder_v2.html` — Path/Group structure recording
- `pda_review.html` — PDA review and classification
- `pda_manager.html` — PDA CRUD management

## Commands

```bash
# API server
bash restart_api.sh          # restart (also: stop, start, status, log)
# Manual start:
python3 price_lookup_api.py --host 127.0.0.1 --port 8765 --db-file trading_data.duckdb --table futures_1m --v2-db-file v2/data/v2_research.duckdb

# Frontend (static file server)
python3 -m http.server 8000  # then open http://127.0.0.1:8000/v2/docs/kline_viewer.html

# Data pipeline (run in order after fresh import)
python3 v2/scripts/scan_layer1_pda.py --replace
python3 v2/scripts/build_ict_midnight_daily_points.py --replace
python3 v2/scripts/build_pd_extremes.py --replace
python3 v2/scripts/build_reference_groups.py --replace
python3 v2/scripts/backfill_occurrence_time.py
python3 v2/scripts/auto_tag_short_pivots.py

# Import raw CSV (one-time or refresh)
python3 duckdb_import_nq_1m.py --input NQ_full_1min.csv --db-file trading_data.duckdb --create-table --truncate

# DuckDB ad-hoc query
python3 -c "import duckdb; conn = duckdb.connect('v2/data/v2_research.duckdb'); print(conn.execute('SELECT ...').df())"
```

## Key Files

- `price_lookup_api.py` — All API endpoints (~2900 lines, the single backend file)
- `v2/v2_config.yaml` — Central config: fluency weights, PDA type definitions, DB paths, API endpoints. Both code and frontend read from this.
- `v2/scripts/scan_layer1_pda.py` — Layer 1 mechanical PDA scanner (the main scanner)
- `v2/schema/*.sql` — Database schema definitions for `pda_registry`, `pda_events`, `pda_members`, `pd_extremes`, `reference_groups`
- `v2/docs/kline_viewer.html` — Active frontend development target

## Databases

- `trading_data.duckdb` — 1m OHLCV data (`futures_1m` table, ~460MB)
- `v2/data/v2_research.duckdb` — PDA research data (`pda_registry`, `pda_events`, `pda_members`, `pd_extremes`, `reference_groups`, `reference_group_members`, ~130MB)
- Restore points in `v2/data/restore_points/`

## Constraints

- YAML files are the truth source for Layer 2 data; DuckDB is a query/statistics mirror, not the primary store
- No test suite exists yet — `check_pda_scan.py` is a diagnostic sanity checker, not a test framework
- Dependencies: `duckdb`, `yaml` (PyYAML). No requirements.txt or packaging config.
- PDA timeframes: `W, D, 4H, 1H, 30M, 15M`
- PDA categories: point (bsl/ssl), range (fvg/ob), composite (eqh/eql)
- `.duckdb` files are gitignored — never delete them; use trash if cleanup needed
- Point-in-time discipline: backtesting must only use data visible at the observation time (9:29截面), no look-ahead bias
- Do not auto-execute any order-placement code
- All timestamps stored in UTC, displayed in Asia/Shanghai or US/Eastern depending on context

## Design Principles (from PROJECT_PROFILE.md)

Before adding any feature, ask:
1. Does it help study 9:30-10:30 move probabilities?
2. Does it help study 9:30-10:30 opportunity probabilities?
3. Can it be reasonably defined at the 9:29 observation point?
4. Does it emphasize time structure, not just price results?

Automation handles objective fields (time mapping, price lookup, range positioning, premium/discount, direction). Stay conservative on subjective fields (bias, narrative, nearest draw, skip reason).