# Standalone V4 Plan

Goal: make the `v4/` folder runnable after copying it out of the parent `backtesting/` workspace.

## Current Blockers

1. `v4/v4_api.py` imports from the parent folder:
   - `../price_lookup_api.py`
   - required functions: `query_v2_bars`, `query_price`, `open_db`, `_parse_datetime`
2. `v4/v4_config.yaml` points to the parent DuckDB file:
   - current path: `../trading_data.duckdb`
3. `v4/start.sh` hardcodes a local Python path:
   - current path: `/home/leo/miniconda3/bin/python3`
4. user docs still assume running from `/home/leo/myworkspace/trading/backtesting`.

## Target Shape

```text
v4/
  index.html
  style.css
  start.sh
  v4_api.py
  v4_config.yaml
  server/
    price_lookup.py
  data/
    trading_data.duckdb        # local runtime asset, not committed
    economic_calendar/
    daily-regime-nq.csv
    vix-daily.csv
  src/
  vendor/
  tests/
  docs/
```

The folder should run with:

```bash
cd v4
bash start.sh start
```

Expected URLs:

```text
http://127.0.0.1:8001/index.html
http://127.0.0.1:8766/v4/health
```

## Implementation Steps

1. Freeze standalone boundaries.
   - Keep the frontend static.
   - Keep the backend as Python stdlib HTTP server plus existing Python dependencies.
   - Do not introduce npm, bundlers, or a packaging framework.
   - Do not commit local runtime files: `.api.log`, `.api_pid`, `.web.log`, `__pycache__`, DuckDB database.

2. Move V4 API query dependency inside `v4/`.
   - Create `v4/server/price_lookup.py`.
   - Copy or extract only the query code V4 uses from parent `price_lookup_api.py`.
   - Change `v4_api.py` to import from `server.price_lookup`.
   - Remove `sys.path.insert(..., "..")`.

3. Make database location standalone.
   - Change default config path to `data/trading_data.duckdb`.
   - Add optional environment override, for example `V4_TRADING_DB=/path/to/trading_data.duckdb`.
   - Keep `trading_data.duckdb` out of git.

4. De-localize startup.
   - Change `start.sh` to use `PYTHON_BIN="${PYTHON_BIN:-python3}"`.
   - Start API from the `v4/` directory.
   - Start static web from the `v4/` directory.
   - Decide and document final URL:
     - preferred standalone URL: `http://127.0.0.1:8001/index.html`
     - old workspace URL can remain documented as legacy: `http://127.0.0.1:8001/v4/index.html`

5. Add standalone run guide.
   - Explain required Python modules.
   - Explain data copy or symlink:
     - copy: `cp ../trading_data.duckdb v4/data/trading_data.duckdb`
     - symlink: `ln -s /path/to/trading_data.duckdb v4/data/trading_data.duckdb`
   - Include health check and one short `/v4/bars` example.

6. Validate in a copied folder.
   - Copy `v4/` to `/tmp/v4-standalone-smoke`.
   - Ensure no parent `price_lookup_api.py` exists in that temp parent.
   - Point database via `V4_TRADING_DB` or copy/symlink the database.
   - Run:
     - `python3 -m py_compile v4_api.py server/price_lookup.py`
     - `bash start.sh start` or direct API process smoke
     - `curl http://127.0.0.1:8766/v4/health`
     - short `/v4/bars` request
     - static page HTTP 200
     - existing JS smoke tests from the original repo

## Acceptance Criteria

- `v4/` can be copied to a new directory and run without the parent `backtesting/` folder.
- `v4_api.py` has no parent-folder import.
- `v4_config.yaml` default database path is inside `v4/data/`.
- Python path is not hardcoded to `/home/leo`.
- Documentation clearly separates runtime data from committed source.
- Existing V4 smoke tests continue to pass.
