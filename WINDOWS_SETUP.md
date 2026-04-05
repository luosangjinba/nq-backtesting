# Windows Migration Guide

This project uses DuckDB, so Windows deployment does not require any separate database service.

The main files are:

- `yaml_panel.html`: the browser UI for filling and exporting YAML
- `price_lookup_api.py`: the local HTTP API that reads prices from a DuckDB file
- `duckdb_import_nq_1m.py`: imports your CSV into DuckDB

## 1. Install prerequisites

Install these on Windows:

- Python 3.11+ with `python` added to `PATH`
- DuckDB Python package
- A modern browser such as Chrome or Edge

Quick verification in `cmd.exe`:

```bat
python --version
python -m pip install duckdb
python -c "import duckdb; print(duckdb.__version__)"
```

## 2. Copy project files

Copy this folder to Windows, including at least:

- `yaml_panel.html`
- `price_lookup_api.py`
- `duckdb_import_nq_1m.py`
- `duckdb_schema.sql`
- `start_api.bat`
- `start_ui.bat`
- `start_all.bat`

Also copy your market data CSV, for example:

- `NQ_full_1min.csv`

## 3. Build the DuckDB database

Run this in the project folder:

```bat
python duckdb_import_nq_1m.py --input NQ_full_1min.csv --db-file trading_data.duckdb --create-table --truncate
```

That creates:

- `trading_data.duckdb`

If you want a different file name:

```bat
python duckdb_import_nq_1m.py --input NQ_full_1min.csv --db-file my_prices.duckdb --create-table --truncate
```

## 4. Start the price lookup API

For local-only use on the same Windows machine, run:

```bat
start_api.bat
```

Default values:

- db file: `trading_data.duckdb`
- host: `127.0.0.1`
- port: `8765`
- table: `futures_1m`

Health check:

```bat
curl http://127.0.0.1:8765/health
```

Expected response:

```json
{"ok": true, "database": "trading_data.duckdb", ...}
```

If you want LAN access too:

```bat
set PRICE_HOST=0.0.0.0
start_api.bat
```

## 5. Start the UI

Run:

```bat
start_ui.bat
```

Then open:

```text
http://127.0.0.1:8000/yaml_panel.html
```

Do not open `yaml_panel.html` with `file://`.
Use the local HTTP server from `start_ui.bat`, otherwise browser security rules may block API requests.

## 6. Fill the API address in the page

### If the browser and API are on the same Windows machine

Use:

```text
http://127.0.0.1:8765
```

### If the browser is on another machine in the same LAN

Start the API with:

```bat
set PRICE_HOST=0.0.0.0
start_api.bat
```

Find the Windows machine IP:

```bat
ipconfig
```

Then use:

```text
http://<windows-ip>:8765
```

If needed, also expose the UI:

```bat
set UI_HOST=0.0.0.0
start_ui.bat
```

Then open:

```text
http://<windows-ip>:8000/yaml_panel.html
```

## 7. One-click startup

If you prefer, use:

```bat
start_all.bat
```

This opens two separate command windows automatically:

- one for the price lookup API
- one for the UI static server

## 8. Firewall notes

If you access the UI or API from another machine, Windows Firewall may prompt you.
Allow access for:

- Python on port `8000`
- Python on port `8765`

If LAN access still fails, verify these from the Windows machine:

```bat
curl http://127.0.0.1:8765/health
curl http://<windows-ip>:8765/health
```

## 9. Useful environment overrides

You can override defaults before running the batch files:

```bat
set PRICE_DB_FILE=trading_data.duckdb
set PRICE_HOST=0.0.0.0
set PRICE_PORT=8765
set PRICE_TABLE=futures_1m
start_api.bat
```

```bat
set UI_HOST=0.0.0.0
set UI_PORT=8000
start_ui.bat
```

## 10. Troubleshooting

### `python` not found

Install Python and check "Add Python to PATH" during installation.

### `No module named duckdb`

Install DuckDB:

```bat
python -m pip install duckdb
```

### Page shows `未连接`

Check:

```bat
curl http://127.0.0.1:8765/health
```

If it works, confirm the page's API address matches the machine running `price_lookup_api.py`.

### `duckdb file not found`

Create the database first:

```bat
python duckdb_import_nq_1m.py --input NQ_full_1min.csv --db-file trading_data.duckdb --create-table --truncate
```

### Port already in use

Either stop the old process or change the port:

```bat
set PRICE_PORT=8766
start_api.bat
```

### Blank page or blocked requests

Always open the UI through:

```text
http://127.0.0.1:8000/yaml_panel.html
```

not by double-clicking the HTML file directly.

## 11. Recommended daily workflow

Terminal 1:

```bat
start_api.bat
```

Terminal 2:

```bat
start_ui.bat
```

Then open:

```text
http://127.0.0.1:8000/yaml_panel.html
```
