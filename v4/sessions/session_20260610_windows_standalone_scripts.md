# Session 2026-06-10: Windows Standalone V4 Startup Scripts

Branch: `feature/v4-standalone-folder`

Goal:

- Put the Windows V4 startup entry points inside `v4/` so the standalone folder is self-contained on Linux and Windows.

Implementation:

- Added `v4/start_windows.bat`.
- Added `v4/start_windows.ps1`.
- The PowerShell script resolves `$V4Dir` from its own path and does not assume the parent `backtesting/` workspace.
- Default database path is `data\trading_data.duckdb`.
- `V4_TRADING_DB` can override the database path.
- The web URL is `http://127.0.0.1:8001/index.html`.
- Supported actions: `setup`, `start`, `stop`, `restart`, `status`, `log`.
- Updated `docs/user/STANDALONE_RUN.md`.
- Added Step 279 to `TODO.md`.

Notes:

- Root-level `deploy_v4_windows.bat` and `deploy_v4_windows.ps1` remain untracked local files and were not added to this branch.
