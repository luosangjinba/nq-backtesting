# Session 2026-06-10: V4-Only Cleanup

Branch: `feature/v4-only-cleanup`

Goal:

- Make the repository working tree focused on standalone V4 by removing external V2/V3/root/architecture historical files.

Plan:

- Keep `v4/` as the product workspace.
- Keep minimal repo-level metadata and `readme.md`.
- Remove tracked external history folders and old root scripts/docs.
- Update V4 legacy docs so they no longer link to removed external paths.
- Leave untracked runtime files such as `v4/data/trading_data.duckdb` uncommitted.

Notes:

- Removed historical material remains recoverable from git history.
- Cleaned untracked external leftovers after confirming V4 has its own runtime DB:
  `.web_pid`, root `__pycache__/`, root `trading_data.duckdb`, root `deploy_v4_windows.*`, and untracked `v3/`.
- Updated `.gitignore` for v4-only runtime files: API/Web logs and pid files, Python cache, `v4/data/trading_data.duckdb`, and local `v4/data/vix-monthly.csv`.
