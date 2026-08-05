# Session — 2026-08-04 — Pre-Server-Reboot Handoff

## Request

Preserve all work and handoff documentation before the planned server reboot.

## Durable State

- branch: `v7/rebuild`;
- completed NQ full-chain repair commit: `9e94af07`;
- completed ES full-chain repair commit: `b91a1057`;
- authoritative database:
  `/home/leo/myworkspace/trading/backtesting/v4/data/trading_data.duckdb`;
- final rows: 12,662,287 total, 6,494,880 ES, and 6,167,407 NQ;
- duplicate timestamps: zero for both instruments;
- final Roll Calendar revision:
  `86d01ee693741bd0200c435de843a3bea3671ace1f4a8dfc02f203aaf96469fd`.

The complete policy, mutation, verification, and recovery records remain in
`v7/docs/V7_NQ_DATABENTO_FULL_CHAIN_REPAIR.md` and
`v7/docs/V7_ES_DATABENTO_FULL_CHAIN_REPAIR.md`. The current database state and
all external recovery paths are summarized in
`v7/docs/V7_RESTART_HANDOFF.md`, which remains the first document to read after
restart.

## Runtime Handoff

No historical repair operation remains active. The V4 API and V7 static server
are ephemeral processes and must be restarted after the machine returns. The
machine-local `v4/.env.local` points the API at the authoritative database.

From the repository root:

```bash
bash v4/start.sh restart
```

Then, in a separate terminal:

```bash
node v7/scripts/serve.mjs 8007
```

Verify `http://127.0.0.1:8766/v4/health` and
`http://127.0.0.1:8007/v7/app/`. Do not rerun either historical repair manifest
during ordinary restart.

## Preservation Check

- all seven external NQ/ES database backup, calendar backup, Preview manifest,
  and shared append-only audit paths referenced by the binding repair records
  existed immediately before documentation closure;
- the handoff update is documentation-only and does not mutate DuckDB or the
  Roll Calendar;
- `git diff --check` and a clean post-commit worktree are the closure gates.
