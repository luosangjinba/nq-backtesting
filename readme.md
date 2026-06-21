# V4 Backtesting Workspace

This repository now keeps the current V4 chart-review workspace only.

V4 is a standalone chart-based review tool for replaying NQ/ES candles, marking PDAs, drawing price legs, writing Chart Notes, building Order Setups, maintaining Live Records, reviewing days through Calendar/Inspector, and manually marking SMT evidence with an ES secondary chart.

## Start

Linux:

```bash
cd v4
bash start.sh start
```

Windows:

```powershell
cd v4
.\start_windows.ps1 -Action start
```

Open:

```text
http://127.0.0.1:8001/index.html
```

API health:

```text
http://127.0.0.1:8766/v4/health
```

## Runtime Data

The default database path is:

```text
v4/data/trading_data.duckdb
```

The database is runtime data and is not committed to git. You can override the path with `V4_TRADING_DB`.

## Documentation

- [V4 documentation index](v4/docs/README.md)
- [Standalone run guide](v4/docs/user/STANDALONE_RUN.md)
- [Chinese user guide](v4/docs/user/USER_GUIDE.zh-CN.md)
- [English user guide](v4/docs/user/USER_GUIDE.en.md)
- [Current TODO](v4/TODO.md)

## Live Record Imports

The Data Maintenance page can convert Tradovate exports into V4 Live Records. It accepts either individual CSV files or one ZIP package containing `Performance`, `Orders`, `Fills`, `Position History`, `Cash History`, and `Account Balance History` CSVs. Preview runs file-alignment and reconciliation checks before downloading Review JSON; warnings are shown in the output and do not upload private export files to the API.

## Historical Material

V2, V3, root-level legacy docs, and architecture notes were removed from this v4-only branch to keep the workspace focused. They remain recoverable from git history before the v4-only cleanup.
