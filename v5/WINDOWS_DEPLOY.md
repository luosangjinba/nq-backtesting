# V5 Windows Local Deployment

This starts the V5 replay workstation on a Windows performance machine for
local manual testing.

## What It Runs

- V4 data API from `v4/v4_api.py`
  - default URL: `http://127.0.0.1:8766/v4/health`
  - V5 uses this API for `/v4/bars`
- V5 static frontend from the repository root
  - default URL: `http://127.0.0.1:8010/v5/index.html`

Logs and PID files are written to:

```text
tmp\windows-v5
```

## First Run

From PowerShell or cmd:

```bat
v5\start_windows.bat
```

The default bat action installs Python dependencies, starts both services, and
opens the browser.

## Common Commands

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File v5\start_windows.ps1 -Action start -OpenBrowser
powershell -NoProfile -ExecutionPolicy Bypass -File v5\start_windows.ps1 -Action stop
powershell -NoProfile -ExecutionPolicy Bypass -File v5\start_windows.ps1 -Action restart -OpenBrowser
powershell -NoProfile -ExecutionPolicy Bypass -File v5\start_windows.ps1 -Action status
powershell -NoProfile -ExecutionPolicy Bypass -File v5\start_windows.ps1 -Action log
```

Install dependencies only:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File v5\start_windows.ps1 -Action install-deps
```

Use a custom Python executable:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File v5\start_windows.ps1 -Python C:\Python311\python.exe -Action start -OpenBrowser
```

Use a copied DuckDB file from another location:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File v5\start_windows.ps1 -TradingDb D:\data\trading_data.duckdb -Action start -OpenBrowser
```

## Data File

By default the API reads:

```text
v4\data\trading_data.duckdb
```

If the database is elsewhere, pass `-TradingDb` or set `V4_TRADING_DB`.

## Notes

- Use the browser on the Windows machine itself with `127.0.0.1` or
  `localhost`.
- LAN access by IP is not the default target yet. Current V5 API-base logic is
  local-dev oriented; LAN serving should be handled by a small reverse proxy or
  a later deployment step.
- `v4/v4_config.yaml` owns the API port `8766`; this script does not patch that
  file.
