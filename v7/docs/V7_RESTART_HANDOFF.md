# V7 Restart Handoff

Last updated: 2026-07-20 after R4.3 completion

This is the first document to read after a machine, server, or agent restart.
It records the exact continuation point; historical session notes are not
required for normal startup.

## Repository State

- repository: `/home/leo/myworkspace/trading/backtesting-v7`
- branch: `v7/rebuild`
- completed code baseline: current R4.3 commit
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

- `sessions/session_20260720_r4_1_workspace_transaction_runtime.md`.
- `sessions/session_20260720_r4_2_projection_domain.md`.
- `sessions/session_20260720_r4_3_chart_snapshot_application.md`.
- this handoff plus `docs/V7_CHART_SNAPSHOT_APPLICATION.md`.

## Completed Boundary

R3.3 Replay and R4.1–R4.3 atomic chart foundations are complete:

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
- H005/H006/H008/H009/H010 are executable pending the real chart acceptance
  boundary, and H011/H039/H040 have automated evidence.

Latest R3.3 commits, oldest to newest:

1. `356577d8 feat(v7): define replay cursor contract`
2. `f9cb0626 feat(v7): add visible-commit replay clock`
3. `56fdfce4 feat(v7): add bounded replay prefetch advice`

R4.1–R4.3 are the commits after this handoff's original R3.3 baseline.

## Deliberately Not Implemented

There is still no real provider, actual CME Session Hours policy, higher-
timeframe aggregation policy, real chart adapter, pane/viewport runtime,
Auto Replay timer, or replay workspace UI. The existing browser surface is the
accepted Session Browser only. R4.2's policies and R4.3's chart adapter use
headless fakes and make no browser-visible claim. Do not mistake
absent chart-bearing R4 behavior for a regression.

## Verification After Restart

From the repository root:

```bash
git branch --show-current
git status --short
for test_file in v7/tests/*-harness.js; do node "$test_file"; done
node v7/scripts/serve.mjs 8007
```

Expected results:

- branch is `v7/rebuild`;
- `git status --short` is empty;
- 27 Harness files pass;
- the server prints the V7 Session Browser URL;
- `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8007/v7/app/`
  returns `200` while the service is running.

The server process does not survive a machine reboot and must be restarted.
No second V7 data service is currently required because no real provider is
connected.

## Exact Next Step

Begin bounded R4.4: the pure Viewport Intent Domain before any real chart UI.

R4.4 should first define and prove:

1. pane-local horizontal intent distinguishes stable default/follow and manual
   wall without storing chart-library coordinates as product truth;
2. data/snapshot application preserves manual intent;
3. only explicit Reset/Follow creates a new default intent;
4. Replay advancement places new bars at the existing wall and pushes prior
   bars left through pure deterministic calculations;
5. intent binds Session activation and pane identity without chart mutation;
6. no Replay mutation, Bar Data request, projection, DOM, Lightweight Charts
   dependency, or concrete capability branch;
7. the independent Harness uses pure deterministic inputs only.

The R4.3 library audit is recorded in `V7_CHART_SNAPSHOT_APPLICATION.md`. Recheck
current official documentation before the later real chart-bearing substep if
library versions or the implementation date changes. Do not copy legacy V6
ownership paths.

## Standing Workflow

- every bounded substep receives its own commit;
- run focused Harnesses, full Harness suite, and `git diff --check` before commit;
- update `TODO.md`, architecture metadata, and one session record when closing;
- only interaction or visual changes stop for manual review;
- headless contract/runtime/documentation changes use automated evidence and a
  concise explanation;
- R4's first browser-visible chart slice must stop for interaction and visual
  review before further work.
