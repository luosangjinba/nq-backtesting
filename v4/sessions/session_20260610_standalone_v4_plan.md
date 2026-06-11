# Session 2026-06-10: Standalone V4 Plan

Branch: `main`

Goal:

- Plan the work required for `v4/` to run as a standalone folder outside the parent `backtesting/` workspace.

Current blockers:

- `v4/v4_api.py` imports `price_lookup_api.py` from the parent folder.
- `v4/v4_config.yaml` defaults to `../trading_data.duckdb`.
- `v4/start.sh` hardcodes `/home/leo/miniconda3/bin/python3`.
- User docs still assume the parent workspace path.

Plan written:

- Added Step 278 to `v4/TODO.md`.
- Added `v4/docs/planning/STANDALONE_V4_PLAN.md`.

Execution boundary:

- Do not commit large runtime data.
- Do not move V2/V3/root historical folders as part of standalone V4.
- Validate by copying `v4/` into `/tmp/v4-standalone-smoke` before marking the work done.

Step 278.1 boundary check:

- Keep the frontend as static files: `index.html`, `style.css`, `src/`, `vendor/`.
- Keep the API as a local Python stdlib HTTP server plus installed runtime packages already required by V4.
- Move V4 price/K-line query code inside `v4/`; do not import parent `price_lookup_api.py`.
- Default runtime DB location is inside `v4/data/`, with an env var override for local installs.
- Runtime logs, pid files, pycache, and the large DuckDB file stay untracked.

Step 278.2 implementation:

- Added local `v4/server/price_lookup.py` with `open_db`, `_parse_datetime`, `query_v2_bars`, and timestamp-based `query_price`.
- Added `v4/server/__init__.py`.
- Updated `v4_api.py` to use `#!/usr/bin/env python3` and import from `server.price_lookup`.
- Removed the parent-directory `sys.path` insertion and parent `price_lookup_api.py` dependency.

Step 278.3 implementation:

- Changed `v4_config.yaml` default trading DB path to `data/trading_data.duckdb`.
- Added `V4_TRADING_DB` support in `v4_api.py`; absolute paths are used as-is, relative paths resolve from the V4 folder.
- Kept large DuckDB runtime data out of git.

Step 278.4 implementation:

- Updated `start.sh` to use `${PYTHON_BIN:-python3}` instead of a machine-specific interpreter path.
- Added `V4_WEB_PORT` override for the static server port.
- Changed the standalone page URL to `http://127.0.0.1:8001/index.html`.
- Kept all runtime files local to the V4 folder.

Step 278.5 implementation:

- Added `docs/user/STANDALONE_RUN.md` with folder shape, data setup, startup, ports, health check, and troubleshooting.
- Updated both user guides to start from the V4 folder and open `/index.html`.
- Linked the standalone run guide and plan from `docs/README.md`.

Step 278.6 validation:

- Ran all existing `v4/tests/*.js`; all passed with only existing Node module-type warnings.
- Copied `v4/` to `/tmp/v4-standalone-smoke`.
- Confirmed the standalone copy does not contain parent `price_lookup_api.py`.
- Copied runtime DB to `/tmp/v4-standalone-smoke/data/trading_data.duckdb` for smoke only.
- Started `/tmp/v4-standalone-smoke/v4_api.py` outside the sandbox because local port binding is restricted in the sandbox.
- Verified `http://127.0.0.1:8766/v4/health` returned `{"status":"ok","version":"4.0"}`.
- Verified `/v4/bars?instrument=NQ&start=2012-01-06%2009:30&end=2012-01-06%2010:00&tf=5` returned NQ bars.
- Started a temporary static server from `/tmp/v4-standalone-smoke` and verified `/index.html` returned HTTP 200.
- Stopped the temporary API/Web processes after validation.
