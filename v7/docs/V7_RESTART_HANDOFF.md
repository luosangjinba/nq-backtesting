# V7 Restart Handoff

Last updated: 2026-07-21 after R6.8b text-only Replay selectors

This is the first document to read after a machine, server, or agent restart.
It records the exact continuation point; historical session notes are not
required for normal startup.

## Repository State

- repository: `/home/leo/myworkspace/trading/backtesting-v7`
- branch: `v7/rebuild`
- implemented code baseline: human-accepted R4.5 and R5.1–R5.6; completed
  headless R6.1–R6.4; human-rejected R6.5 real Pane workspace and R6.6 combined
  bar-step interaction gate; R6.7 continuous Autoplay implemented; R6.7a
  multi-Pane RTH history preservation implemented; and R6.7b manual Viewport
  span, contributing history-window, and stable-toolbar corrections accepted as
  one combined R6.7 gate; combined R6.8/R6.8a–b fixed Replay transport,
  truncation, Sync timeframe, and text-only selectors awaiting human review
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

Do not load all historical `sessions/` records. For R6 planning, read only the
R6-relevant architecture/roadmap documents plus:

- `sessions/session_20260720_r4_5_lightweight_chart_slice.md`.
- `sessions/session_20260720_r5_1_v6_interaction_carry_forward.md`.
- `sessions/session_20260720_r5_2_session_hours_domain.md`.
- `sessions/session_20260720_r5_3_fixed_timeframe_domain.md`.
- `sessions/session_20260720_r5_4_workspace_replacement_runtime.md`.
- `sessions/session_20260720_r5_5_compact_workspace_controls.md`.
- `sessions/session_20260720_r5_6_real_v4_bars_provider.md`.
- `sessions/session_20260720_r5_6a_exchange_time_presentation.md` through
  `sessions/session_20260720_r5_6f_corrective_gate.md`.
- `sessions/session_20260720_r5_6g_second_review_rejection.md` and
  `sessions/session_20260720_r5_6h_second_review_corrections.md`.
- `sessions/session_20260721_r5_6i_third_review_rejection.md` and
  `sessions/session_20260721_r5_6j_third_review_corrections.md`.
- `sessions/session_20260721_r5_6k_fourth_review_rejection.md` and
  `sessions/session_20260721_r5_6l_history_responsiveness.md`.
- `sessions/session_20260721_r5_6m_fifth_review_acceptance.md`.
- `sessions/session_20260721_r6_1_pane_workspace_domain.md`.
- `sessions/session_20260721_r6_2_replay_pane_response_contract.md`.
- `sessions/session_20260721_r6_3_pane_set_materialization.md`.
- `sessions/session_20260721_r6_4_replay_navigation_runtime.md`.
- `sessions/session_20260721_r6_5_real_pane_workspace.md`.
- `sessions/session_20260721_r6_6_replay_bar_step.md`.
- `sessions/session_20260721_r6_7_continuous_autoplay.md`.
- `sessions/session_20260721_r6_7a_multi_pane_rth_history.md`.
- `sessions/session_20260721_r6_7b_manual_viewport_span.md`.
- `sessions/session_20260721_r6_7c_contributing_history_windows.md`.
- `sessions/session_20260721_r6_7d_stable_toolbar_refresh.md`.
- `sessions/session_20260721_r6_8_fixed_replay_transport.md`.
- `sessions/session_20260721_r6_4_replay_navigation_runtime.md`.
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
- R5.6g records the second human rejection: browser-local Session input,
  RTH-specific completion offsets, 20-second high-TF work, empty left context,
  and perceptible ETH→RTH latency.
- R5.6h makes Session input explicitly New York, gives ETH/RTH one completion
  grid, bounds target-sized history without recursive foreground continuation,
  caches exchange offsets, and clamps transient logical range when bounded
  high-TF history is shorter than the canonical Viewport span.
- R5.6i records the third human rejection: replacement could splice separated
  old/new source windows into a ten-day `1h` hole, while a heavily dragged
  low-TF wall could become an invalid aggregate logical range.
- R5.6j retains only contiguous source-window prefixes, rejects gaps in
  Projection, and repairs adapter-only inverted logical ranges without
  changing canonical Viewport intent.
- R5.6k records the fourth human rejection: rapid boundary dragging accumulated
  history into a multi-second synchronous full-projection/response path that
  stopped mouse response.
- R5.6l adds bounded incremental history Projection, validated Raw Bar trust
  paths, allocation-light calendar/aggregation loops, deterministic modern New
  York DST conversion, and yielding seven-day V4 transport chunks.
- R5.6m records explicit fifth-review acceptance and closes the complete R5.6
  corrective gate, unblocking R6.
- R6.1 defines one uniform one-to-many Pane intent value, binds Pane instruments
  to Session assets, validates one shared Replay cursor through pane-local
  Viewport intent, and isolates focus plus instrument-sync transitions.
- R6.2 binds Next, Previous, Autoplay, Restart/Back-to, five quick New York
  GoTo anchors, and exact forward/backward GoTo to every visible Pane through
  one pure atomic response plan. Session Hours remains Session-scoped, forward
  jumps require continuous range coverage, and Economic Calendar is deferred
  to an optional business module.
- R6.3 materializes every planned Pane behind the existing Workspace
  Transaction acquisition/Projection stages and applies one exact complete set
  through the existing sole Chart Snapshot Application writer. Mixed
  instruments/timeframes, explicit empty Panes, delayed supersession, and all
  dependency/application failures preserve the last accepted atomic state.
- R6.4 gives Replay one exact forward/backward target-proposal path and real
  playing/paused state, resolves Next/Previous and DST-aware New York quick
  anchors through an injected primary-source traversal port, and routes all
  non-no-op actions through one R6.3 transaction. Overlap has no backlog;
  failures pause and preserve the last accepted state.
- R6.5 mounted the real one/two-Pane workspace but human review rejected its
  implicit Next-minute behavior, interim transport, limited layouts, and
  missing layout sync.
- R6.6 adds one Session-level Replay bar-step grid independent from Pane TF,
  resolves real aligned non-empty Next/Previous completions through Bar Data,
  and exposes the selector plus `Next bar`. Human review retained that
  invariant but rejected the combined gate because Autoplay executed only one
  step and Pause had no scheduled continuation to stop.
- R6.7 adds a completion-driven UI cadence owner over the existing one-step
  action. Play advances immediately and continues only after each prior atomic
  all-Pane visible commit plus `500ms`; Pause clears future work, including
  during an in-flight settlement, and Session completion/failure stops
  playback through Replay Runtime.
- R6.7a fixes the review-discovered ETH→RTH multi-Pane history regression.
  Consecutive earlier closed-session windows now advance exact raw coverage
  while preserving an already-ready accepted Pane; current Replay provenance
  is rebound without cursor movement, and real identity/policy/contiguity
  failures remain hard errors.
- R6.7b fixes the follow-up rapid-drag Viewport collapse. A left-clamped manual
  adapter range now translates both endpoints and retains its exact canonical
  span, so no-contribution RTH history cannot create oversized candles; that
  wall survives two-to-one Pane replacement and the next drag extends history.
- R6.7c fixes the next review-discovered RTH `09:30` boundary behavior. A
  nominal history window that is wholly closed now expands, within the same
  bounded raw request, until it reaches up to 240 prior eligible minutes or the
  35-day cap. One accepted transaction crosses an overnight close or weekend;
  it neither synthesizes bars nor starts recursive foreground continuation.
- R6.7d fixes the visual-only toolbar flash during candle refresh. The same DOM
  subtree and functional transaction locks remain, while only transiently
  locked controls retain their ready-state opacity; intrinsic disabled states
  stay visibly disabled.
- The user accepted the combined R6.7/R6.7a–d gate and approved R6.8's fixed
  transport form. R6.8 moves Replay controls into a centered capsule inside a
  dedicated `38px` bottom rail, combines Play/Pause, and adds bounded dynamic
  `0.5×/1×/2×/5×` completion cadence without entering Replay product state or
  overlapping the Pane grid.
- R6.8a adds a Session-bounded truncation/time-machine gesture through the
  existing exact all-Pane transaction, plus the named one-way `Sync timeframe`
  preference and TradingView-like transport icons; it remains part of the
  combined R6.8 human review gate.
- R6.8b removes native dropdown arrows from the speed and Replay-step
  selectors, orders the plain text values speed-to-step, and preserves native
  click and keyboard selection.

Latest corrective commits:

1. `beaced4f fix(v7): present chart time in New York`
2. `8d93cd92 fix(v7): place aggregate candles at completion`
3. `6dd86fff perf(v7): accelerate aggregate replay updates`
4. `c2abb6f0 fix(v7): delay slow refresh feedback`
5. `9947f77a fix(v7): open newly created sessions`
6. `4a6e6869 fix(v7): stabilize high-timeframe replay interactions`
7. `af0173c1 fix(v7): use New York session wall time`
8. `55d36761 docs(v7): record third R5.6 review rejection`
9. `8616913c fix(v7): preserve continuous chart replacements`
10. `9d05e0cd docs(v7): record fourth R5.6 review rejection`
11. `3d66f46e perf(v7): keep rapid history loading responsive`

## R5.6 Human Review Result

Status: **accepted and closed**.

On 2026-07-21 the user explicitly reported `R5.6复审通过`. Rapid earlier-history
loading is accepted without the reported input freeze, and the complete R5.6
corrective gate is now binding regression behavior. R6 is unblocked.

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
6. Session creation `12:40` is now New York wall time and produces a `12:40`
   New York initial chart boundary, independent of browser timezone.
7. ETH and RTH share `4m :03/:07/...` and hour-family `:59` completion slots.
8. High-TF replacement no longer starts recursive foreground history work;
   the final real-Chrome gate measured about `1.42s` for uncached `12h` RTH,
   `159ms` for first `5m`, and `72ms` for cache-hit ETH→RTH.
9. Bounded high-TF history no longer leaves an empty left chart margin or needs
   another pointer action to repair its initial logical range.
10. Replacement cannot splice non-adjacent accepted history into a target
    request; Projection also rejects any gapped source-window sequence.
11. A historical low-TF manual wall cannot submit `from > to` after a high-TF
    replacement; the transient range remains valid and includes loaded bars.
12. Real Chrome history→`1h`→RTH→ETH evidence reaches the Replay-visible tail,
    reports a normal 50-hour weekend as its maximum interval, and preserves the
    high-timeframe performance improvement.
13. Deep earlier-history projection cost is bounded to the new plus boundary
    chunks instead of all accumulated raw history.
14. Large V4 logical requests yield between contiguous seven-day transport
    responses without changing Bar Data identity or coverage.
15. Rapid `8h` boundary input coalesces to two visible revisions; the final
    Chrome gate observes no 200ms long task and about a 125ms maximum event-loop
    interval while both history loads complete.

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

Human-review the combined R6.8/R6.8a–b gate. In single and two-Pane modes,
confirm the fixed bottom rail never covers Canvas or moves with Pane focus and
that speed then step appear as arrowless text selectors. Exercise Previous/Next
bar, Replay-step selection, every `0.5×/1×/2×/5×` speed, continuous Play/Pause,
TF, ETH/RTH, history extension, truncation, and `Sync timeframe`. A valid
truncation must remove the selected and all later candles from every Pane; an
outside-Session click must preserve state. Speed/step/sync selection must not
move the cursor; Pause must stop future work while toolbar and transport remain visually stable.
After acceptance, R6.9 implements one-to-four layouts with draggable persisted
boundaries, followed by layout sync. Economic Calendar remains outside this
foundation phase.

## Standing Workflow

- every bounded substep receives its own commit;
- run focused Harnesses, full Harness suite, and `git diff --check` before commit;
- update `TODO.md`, architecture metadata, and one session record when closing;
- only interaction or visual changes stop for manual review;
- headless contract/runtime/documentation changes use automated evidence and a
  concise explanation;
- R4's first browser-visible chart slice must stop for interaction and visual
  review before further work.
