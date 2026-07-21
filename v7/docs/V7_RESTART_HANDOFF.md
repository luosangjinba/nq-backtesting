# V7 Restart Handoff

Last updated: 2026-07-20 after R5.6a–f corrective implementation; human re-review required

This is the first document to read after a machine, server, or agent restart.
It records the exact continuation point; historical session notes are not
required for normal startup.

## Repository State

- repository: `/home/leo/myworkspace/trading/backtesting-v7`
- branch: `v7/rebuild`
- implemented code baseline: human-accepted R4.5, completed R5.1–R5.4, and
  combined R5.5/R5.6 plus R5.6a–f corrections awaiting final human acceptance
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

Do not load all historical `sessions/` records. For the R5.6 re-review, read
only:

- `sessions/session_20260720_r4_5_lightweight_chart_slice.md`.
- `sessions/session_20260720_r5_1_v6_interaction_carry_forward.md`.
- `sessions/session_20260720_r5_2_session_hours_domain.md`.
- `sessions/session_20260720_r5_3_fixed_timeframe_domain.md`.
- `sessions/session_20260720_r5_4_workspace_replacement_runtime.md`.
- `sessions/session_20260720_r5_5_compact_workspace_controls.md`.
- `sessions/session_20260720_r5_6_real_v4_bars_provider.md`.
- `sessions/session_20260720_r5_6a_exchange_time_presentation.md` through
  `sessions/session_20260720_r5_6f_corrective_gate.md`.
- this handoff plus `docs/V7_V6_INTERACTION_CARRY_FORWARD.md`.
- the V6 ETH/RTH Phase A1/A2/A3 documents targeted by R5.2.
- the revised human checklist at
  `docs/V7_R5_6_CORRECTIVE_REVIEW.md`.

## Completed Boundary

R3.3 Replay and R4.1–R4.4 headless foundations are complete; R4.5 is implemented
and human-accepted:

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
- NQ/`1m`/ETH chart entry reveals a 120-minute historical prefix plus the
  selected Session start bar through one transaction; Manual Next reveals one
  additional eligible source bar;
- full replacements use two rendering opportunities plus screenshot-proven
  candle pixels; safe tail updates require exact series-change evidence plus
  two rendering opportunities;
- native drag creates manual wall intent, Next preserves it, and Reset View
  explicitly restores default intent;
- the NQ route uses an immersive chart-first shell with compact controls and no
  centered cache-hit update overlay;
- the UI discloses its real local V4/DuckDB market-data feed;
- H005/H006/H008/H009/H010/H013/H014/H015/H016/H017/H042 are human-accepted through
  the R4.5 browser review; H011/H039/H040/H041 have automated evidence.
- R5.1 binds settled V6 Reset View, Replay, Settings, multi-pane, ETH/RTH, and
  multi-instrument interaction decisions as prior product evidence.
- R5.2 verifies the source wall-clock encoding and activates a pure,
  revisioned ETH/RTH calendar/eligibility/traversal domain without runtime or UI
  mutation.
- R5.3 activates generic canonical fixed-duration OHLCV aggregation policies,
  including inherited whole-hour and configured four-hour-offset grids.
- R5.4 routes registered timeframe/ETH-RTH replacements through the existing
  atomic transaction, with cursor retention, source-level visible-through, and
  acquisition/presentation stale isolation.
- R5.5 mounts one grouped fixed minute/hour TF dropdown and compact ETH/RTH
  controls over that path, preserves cursor/manual wall, and keeps accepted
  chart pixels visible during bounded refresh/error states. Its review
  corrections restore the V6 prefix-plus-start/no-future entry baseline and add
  repeatable bounded leftward history extension.
- R5.6 removes the production synthetic generator and connects the existing
  V4/DuckDB NQ source through an independent, policy-bound adapter with padding
  removal and no silent fallback.
- R5.6a–e present the chart in New York exchange time, separate bucket identity
  from completion-slot display, remove foreground provider/refull-series stalls,
  eliminate cache-hit status flashing, and open new Sessions directly.
- follow-up commits remove the redundant Canvas metadata row and route wheel
  input over the right price axis to pointer-anchored vertical zoom; plot wheel
  remains horizontal and Reset View restores price autoscale.

Latest corrective commits:

1. `beaced4f fix(v7): present chart time in New York`
2. `8d93cd92 fix(v7): place aggregate candles at completion`
3. `6dd86fff perf(v7): accelerate aggregate replay updates`
4. `c2abb6f0 fix(v7): delay slow refresh feedback`
5. `9947f77a fix(v7): open newly created sessions`

## R5.6 Human Review Result

Status: **corrective implementation complete; human re-review pending**.

Passed and protected:

- real NQ candles, exact initial no-future boundary, and one source minute per
  Next;
- repeated leftward history extension without moving Replay;
- compact single-column TF menu and atomic ETH/RTH replacement;
- plot-wheel horizontal zoom, price-axis wheel vertical zoom, and Reset View;
- full-height Canvas with no feed/wall/cursor metadata strip.

Corrective implementation, in order:

1. New York exchange-axis presentation is locked without changing real source,
   request, cache, Projection, or Replay instants.
2. Projected bars retain bucket `startEpochMs` and carry chart-only
   `displayEpochMs` for `4m :03/:07/...`, `30m :29/:59`, and `1h :59`.
3. Bounded forward raw coverage plus safe adapter tail updates produce zero
   provider requests across 100 covered `5m` Next actions; the final full-gate
   run remains below the binding p95/p99/max thresholds.
4. Cache-hit work shows no `Updating…`; slow replacement dimming begins only
   after 500 ms and contains no overlay text.
5. Successful Session creation navigates to and activates the exact new route.

Use V6 source/docs/tests as binding interaction evidence for items 1–4. Do not
restart product interviews or copy V6 runtime ownership.

Latest R3.3 commits, oldest to newest:

1. `356577d8 feat(v7): define replay cursor contract`
2. `f9cb0626 feat(v7): add visible-commit replay clock`
3. `56fdfce4 feat(v7): add bounded replay prefetch advice`

R4.1–R4.5 are the commits after this handoff's original R3.3 baseline.

## Deliberately Not Implemented

There is still no production-complete CME holiday dataset, calendar-aligned
day/week/month policy, Auto Replay timer, multi-pane layout, or durable
workspace restore. V7 now uses real local V4/DuckDB NQ history, but this does
not imply complete exchange-calendar or tick-level coverage.

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
- all Harness files pass;
- the server prints the V7 Session Browser URL;
- `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8007/v7/app/`
  returns `200` while the service is running.

The server process does not survive a machine reboot and must be restarted.
The existing V4 API on `127.0.0.1:8766` is required for the real chart. If it
is unavailable, V7 shows Chart unavailable and does not substitute fake bars.

After a service restart verify both endpoints:

```bash
curl -s http://127.0.0.1:8766/v4/health
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8007/v7/app/
```

## Exact Next Step

Execute `docs/V7_R5_6_CORRECTIVE_REVIEW.md`. Record acceptance or the exact
failed item before any replacement work. Do not begin R6 multi-pane,
persistence, or expanded Replay transport until R5.6 is explicitly accepted.

## Standing Workflow

- every bounded substep receives its own commit;
- run focused Harnesses, full Harness suite, and `git diff --check` before commit;
- update `TODO.md`, architecture metadata, and one session record when closing;
- only interaction or visual changes stop for manual review;
- headless contract/runtime/documentation changes use automated evidence and a
  concise explanation;
- R4's first browser-visible chart slice must stop for interaction and visual
  review before further work.
