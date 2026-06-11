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
