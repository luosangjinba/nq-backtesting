# V7 Restart Handoff

Last updated: 2026-07-20 after R4.2 completion

This is the first document to read after a machine, server, or agent restart.
It records the exact continuation point; historical session notes are not
required for normal startup.

## Repository State

- repository: `/home/leo/myworkspace/trading/backtesting-v7`
- branch: `v7/rebuild`
- completed code baseline: current R4.2 commit
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

Do not load all historical `sessions/` records. The five most recent records
are sufficient for a targeted R3.3/R4.1/R4.2 audit:

- `sessions/session_20260720_r3_3a_replay_contract.md`;
- `sessions/session_20260720_r3_3b_replay_runtime.md`;
- `sessions/session_20260720_r3_3c_replay_prefetch.md`.
- `sessions/session_20260720_r4_1_workspace_transaction_runtime.md`.
- `sessions/session_20260720_r4_2_projection_domain.md`.

## Completed Boundary

R3.3 Replay, R4.1 Workspace Transaction, and R4.2 Projection foundations are complete:

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
- H005/H006/H008/H009/H010 are executable pending the real chart acceptance
  boundary, and H011 remains accepted with automated evidence.

Latest R3.3 commits, oldest to newest:

1. `356577d8 feat(v7): define replay cursor contract`
2. `f9cb0626 feat(v7): add visible-commit replay clock`
3. `56fdfce4 feat(v7): add bounded replay prefetch advice`

R4.1 and R4.2 are the commits after this handoff's original R3.3 baseline.

## Deliberately Not Implemented

There is still no real provider, actual CME Session Hours policy, higher-
timeframe aggregation policy, chart runtime/adapter, pane/viewport runtime,
Auto Replay timer, or replay workspace UI. The existing browser surface is the
accepted Session Browser only. R4.1's visible-completion port and R4.2's policy
ports use headless fakes and make no browser-visible claim. Do not mistake
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
- 26 Harness files pass;
- the server prints the V7 Session Browser URL;
- `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8007/v7/app/`
  returns `200` while the service is running.

The server process does not survive a machine reboot and must be restarted.
No second V7 data service is currently required because no real provider is
connected.

## Exact Next Step

Begin bounded R4.3: the headless Chart Snapshot Application and visible-
completion contract over a fake adapter before any real chart UI.

R4.3 should first define and prove:

1. Chart Runtime/Adapter is the sole chart-series writer boundary;
2. one immutable projected pane snapshot is staged and applied exactly once;
3. visible completion binds the exact transaction identity and snapshot;
4. stale, failed, duplicate, and disposed applications publish no completion;
5. adapter failure preserves the prior accepted chart snapshot;
6. no Replay mutation, Bar Data request, projection, viewport decision, DOM,
   Lightweight Charts dependency, or concrete capability branch;
7. the independent Harness uses a deterministic fake adapter only.

Before the first chart-bearing R4 substep, inspect current official Lightweight
Charts documentation and appropriate awesome-tradingview examples as required
by `AGENTS.md`. Do not copy legacy V6 ownership paths.

## Standing Workflow

- every bounded substep receives its own commit;
- run focused Harnesses, full Harness suite, and `git diff --check` before commit;
- update `TODO.md`, architecture metadata, and one session record when closing;
- only interaction or visual changes stop for manual review;
- headless contract/runtime/documentation changes use automated evidence and a
  concise explanation;
- R4's first browser-visible chart slice must stop for interaction and visual
  review before further work.
