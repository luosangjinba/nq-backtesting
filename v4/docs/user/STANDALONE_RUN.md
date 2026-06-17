# V4 Standalone Run Guide

V4 can run from the `v4/` folder without the parent `backtesting/` workspace.

## Folder Shape

The standalone folder should contain:

```text
v4/
  index.html
  style.css
  start.sh
  v4_api.py
  v4_config.yaml
  server/
  src/
  vendor/
  data/
    trading_data.duckdb
    economic_calendar/
    daily-regime-nq.csv
    vix-daily.csv
  tests/
  docs/
```

`data/trading_data.duckdb` is runtime data. It is intentionally not committed to git.

## Local Environment File

Copy the local environment template when this machine needs secrets or machine-specific paths:

```bash
cp .env.local.example .env.local
```

On Windows:

```powershell
copy .env.local.example .env.local
```

`v4/.env.local` is ignored by git. Both `start.sh` and `start_windows.ps1` load it before starting the API, so values such as `DATABENTO_API_KEY` are available to Data Maintenance actions. See `docs/user/LOCAL_ENVIRONMENT.zh-CN.md`.

## Data Setup

Use one of these options:

```bash
cp /path/to/trading_data.duckdb v4/data/trading_data.duckdb
```

or:

```bash
export V4_TRADING_DB=/path/to/trading_data.duckdb
```

The environment variable can be absolute or relative to the `v4/` folder.

## Start

From inside the V4 folder on Linux:

```bash
cd v4
bash start.sh start
```

If the default `python3` does not have `duckdb` and `yaml`, choose the interpreter explicitly:

```bash
PYTHON_BIN=/path/to/python3 bash start.sh start
```

Open:

```text
http://127.0.0.1:8001/index.html
```

Health check:

```text
http://127.0.0.1:8766/v4/health
```

Common commands:

```bash
bash start.sh status
bash start.sh restart
bash start.sh stop
```

On Windows:

```powershell
cd v4
.\start_windows.ps1 -Action start
```

or double-click/run:

```text
start_windows.bat
```

Windows service commands:

```powershell
.\start_windows.ps1 -Action status
.\start_windows.ps1 -Action restart
.\start_windows.ps1 -Action stop
.\start_windows.ps1 -Action log
```

If Python is not on PATH:

```powershell
.\start_windows.ps1 -Action start -Python C:\Path\To\python.exe
```

## Ports

Defaults:

- API: `8766`
- Web: `8001`

Override the web port with:

```bash
V4_WEB_PORT=8010 bash start.sh start
```

## Troubleshooting

- `Failed to fetch`: check `bash start.sh status` and `http://127.0.0.1:8766/v4/health`.
- `No module named duckdb`: start with `PYTHON_BIN=/path/to/python3 bash start.sh start`.
- `database file not found`: copy `trading_data.duckdb` to `data/trading_data.duckdb` or set `V4_TRADING_DB`.
- Blank chart with API running: check `.api.log` for query or database errors.
