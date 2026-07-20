# V7 Restart Handoff

Last updated: 2026-07-20 after R4.5 implementation, pending human review

This is the first document to read after a machine, server, or agent restart.
It records the exact continuation point; historical session notes are not
required for normal startup.

## Repository State

- repository: `/home/leo/myworkspace/trading/backtesting-v7`
- branch: `v7/rebuild`
- implemented code baseline: current R4.5 commit, not human-accepted yet
- expected worktree after this handoff commit: clean
- browser URL when the static service is running:
  `http://127.0.0.1:8007/v7/app/`

Do not continue V7 work in `/home/leo/myworkspace/trading/backtesting`; that is
the legacy/reference repository. V7 production work belongs to the worktree
listed above.

## Minimal Restart Reading Order

1. repository `AGENTS.md`;
2. this file;
3. `docs/INDEX.md`;
4. `TODO.md`;
5. `docs/V7_ARCHITECTURE.md`;
6. `docs/V7_EXECUTION_ROADMAP.md`;
7. only the documents directly relevant to the next bounded step.

Do not load all historical `sessions/` records. The four most recent records
are sufficient for a targeted R4 audit:

- `sessions/session_20260720_r4_3_chart_snapshot_application.md`.
- `sessions/session_20260720_r4_4_viewport_runtime.md`.
- `sessions/session_20260720_r4_5_lightweight_chart_slice.md`.
- this handoff plus `docs/V7_LIGHTWEIGHT_CHART_SLICE.md`.

## Completed Boundary

R3.3 Replay and R4.1–R4.4 headless foundations are complete; R4.5 is implemented
and awaiting human acceptance:

- Replay advancement is duration-based, not one sampled display candle;
- Manual and Auto inputs share one proposal path;
- one Replay clock exists per branded Session activation;
- proposing advancement has zero accepted-state effects;
- only `commitVisible` publishes cursor/revision progress;
- cross-Session, cross-activation, foreign, rejected, and stale proposals have
  zero cursor side effects;
- the cursor is an exclusive no-future cutoff;
- pure low/high-watermark advice emits bounded forward windows without I/O;
- Bar Data Runtime remains the sole raw requester/cache owner;
- one headless coordinator is scoped to each branded Session activation;
- slow/stale success, stale failure, dependency failure, and disposal preserve
  the last accepted workspace snapshot and Replay cursor;
- exact visible acknowledgement and a final currency check precede acceptance;
- pure pane projection consumes common-identity Raw Bar Batches without I/O;
- exclusive Replay no-future filtering precedes Session Hours eligibility and
  aggregation;
- identity `1m` projection preserves every eligible intermediate source bar;
- projection output carries exact source/capability/calendar/policy/cursor
  provenance and contains no concrete capability-id branch;
- one headless Chart Snapshot Application is the sole chart-series writer;
- frozen projection provenance, exact adapter receipt, and exact visible
  completion bind the same complete transaction and snapshot;
- stage/apply races, failure, duplicate, forged receipt, and disposal cannot
  publish chart completion;
- the fake adapter checks currency at its final visible mutation boundary;
- pure pane-local viewport intent distinguishes default and manual walls;
- Replay cursor/logical-index movement preserves manual origin, offset, span,
  scope, and revision while shifting earlier bars left;
- adapter logical ranges are transient projections, not stored product truth;
- official Lightweight Charts 5.2.0 is isolated behind one real adapter;
- NQ/`1m`/ETH chart entry reveals the complete first hour through one
  transaction, and Manual Next reveals one additional minute;
- visible receipt follows two rendering opportunities and screenshot-proven
  candle pixels rather than `subscribeDataChanged()`;
- native drag creates manual wall intent, Next preserves it, and Reset View
  explicitly restores default intent;
- the UI discloses its deterministic local foundation feed;
- H005/H006/H008/H009/H010 are executable pending the real chart acceptance
  boundary; H013/H014/H016/H017/H042 are executable pending this browser review;
  H011/H039/H040/H041 have automated evidence.

Latest R3.3 commits, oldest to newest:

1. `356577d8 feat(v7): define replay cursor contract`
2. `f9cb0626 feat(v7): add visible-commit replay clock`
3. `56fdfce4 feat(v7): add bounded replay prefetch advice`

R4.1–R4.5 are the commits after this handoff's original R3.3 baseline.

## Deliberately Not Implemented

There is still no real provider, actual CME Session Hours policy, higher-
timeframe aggregation policy, Auto Replay timer, multi-pane layout, or durable
workspace restore. R4.5 uses a clearly disclosed deterministic local foundation
feed. Do not describe it as real CME history or production data coverage.

## Verification After Restart

From the repository root:

```bash
git branch --show-current
git status --short
npm --prefix v7 install
for test_file in v7/tests/*-harness.js; do node "$test_file"; done
node v7/scripts/serve.mjs 8007
```

Expected results:

- branch is `v7/rebuild`;
- `git status --short` is empty;
- 30 Harness files pass;
- the server prints the V7 Session Browser URL;
- `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8007/v7/app/`
  returns `200` while the service is running.

The server process does not survive a machine reboot and must be restarted.
No second V7 data service is currently required because no real provider is
connected.

## Exact Next Step

Perform the mandatory R4.5 human interaction and visual review. Do not begin
R4.6 first.

Review at `http://127.0.0.1:8007/v7/app/`:

1. create an NQ Session spanning more than two hours and open it;
2. confirm the chart is crisp, dense, legible, and visually integrated with the
   accepted shell at desktop size;
3. click Next minute several times and assess visible settlement/perceived lag;
4. drag left, then click Next and confirm the manual candle wall stays fixed;
5. zoom with the wheel, click Next, and confirm span/wall stability;
6. click Reset View and confirm explicit return to the default wall;
7. navigate back and open an unsupported ES-only Session; confirm it retains an
   honest saved-Session summary with no fake chart capability.

Record acceptance or concrete rejection findings in the R4.5 session record.
Only after acceptance may the roadmap choose and number R4.6.

## Standing Workflow

- every bounded substep receives its own commit;
- run focused Harnesses, full Harness suite, and `git diff --check` before commit;
- update `TODO.md`, architecture metadata, and one session record when closing;
- only interaction or visual changes stop for manual review;
- headless contract/runtime/documentation changes use automated evidence and a
  concise explanation;
- R4's first browser-visible chart slice must stop for interaction and visual
  review before further work.
