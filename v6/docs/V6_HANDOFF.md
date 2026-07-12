# V6 Handoff

Last updated: 2026-07-12

## 2026-07-12 Restart Handoff Snapshot

Read this block first after restarting the server or assistant context.

### Repository State

- Branch: `v6/fx-replay-workstation`
- Worktree at handoff: clean after Step 390 closeout
- Latest completed step: Step 390 - Foundation Replay Gap Mode Documentation Closeout
- Recent relevant commits:
  - Step 390 documented the foundation replay-gap mode commands. Routine
    foundation regression uses
    `node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`
    and defaults to the Step 387 fast replay-gap pack. Broad replay-gap
    confirmation uses
    `FOUNDATION_REPLAY_GAP_MODE=full node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`
    or direct Step 274.
  - Step 389 implemented Step 276 replay-gap mode controls. Default/unset and
    `FOUNDATION_REPLAY_GAP_MODE=fast` use the Step 387 fast replay-gap pack,
    while `FOUNDATION_REPLAY_GAP_MODE=full` uses the full Step 274 pack.
    Invalid modes fail before browser members start. The default fast Step 276
    run passed `8/8` in `44597ms`.
  - Step 388 selected Step 276 replay-gap fast/full mode controls with fast
    default. The future default foundation pack should run the Step 387 fast
    replay-gap pack, while `FOUNDATION_REPLAY_GAP_MODE=full` should run the
    full Step 274 replay-gap pack. Step 389 should implement this runner-level
    mode selection.
  - Step 387 added the standalone fast replay-gap browser pack command. It runs
    the Step 385 near-gap manual fixture plus existing low-TF and HTF auto-play
    gap smokes, and passed `3/3` in `24532ms`. Step 274 remains the full
    long-path confirmation command and Step 276 still uses Step 274 for now.
    Step 388 should decide whether the foundation pack keeps full replay-gap
    coverage, switches to the fast pack, or exposes fast/full controls.
  - Step 386 selected a fast/full replay-gap pack split. The current Step 274
    command remains the full long-path confirmation path, Step 276 keeps using
    Step 274 for now, and Step 387 should add a new standalone fast pack
    command that runs the Step 385 near-gap manual fixture plus existing
    low-TF and HTF auto-play gap members.
  - Step 385 implemented the standalone near-gap manual browser fixture
    command. It passed for `1m`/`5m`/`15m` and `1D`/`1W`/`1M`, proving
    `16:58 -> 16:59 -> 18:00 -> 18:01` with `2` pre-gap Manual Next calls
    instead of the long-path `86` loop. Step 274 and Step 276 pack membership
    remain unchanged. Step 386 should decide whether this fixture stays
    standalone, becomes a fast pack member, or drives a fast/full replay-gap
    command split while preserving one long-path source assertion.
  - Step 384 planned the near-gap manual browser fixture. The future standalone
    command should start a session at `2026-06-01T16:50`, set replay cursor to
    `2026-06-01T16:58:00.000Z`, cover `1m`/`5m`/`15m` and `1D`/`1W`/`1M`,
    assert `16:58 -> 16:59 -> 18:00 -> 18:01`, and keep Step 274/Step 276
    membership unchanged while preserving long-path coverage.
  - Step 383 added a harness-only browser timing probe for the low-TF and HTF
    manual replay-gap paths. All six cases used `86` Manual Next calls; the
    Manual Next loop was the dominant cost, with low-TF loops around
    `4.4-5.0s`, `1D` at `9083.7ms`, `1W` at `17361.9ms`, and `1M` at
    `14931.7ms`. Step 384 should plan a near-gap manual fixture before changing
    Step 274 or Step 276 membership.
  - Step 382 audited the Step 274 replay-gap browser pack cost concentration.
    The likely cost owner is browser harness shape plus manual-step scenario
    size: serial child-process member execution, fresh page setup per case,
    long `15:34 -> 18:00` Manual Next loops, and HTF projection assertions in
    the three manual HTF cases. Step 383 should add a measurement-only manual
    path timing probe before any runner split or cost-control change.
  - Step 381 refreshed the chart-foundation regression picture after Step 380.
    `node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`
    passed `8/8` in `105292ms`, and the Step 377 reduced-delay guard passed
    with `4h` `114.3ms`, `8h` `128.8ms`, `1D` `132.3ms`, and `1W` `132.5ms`.
    The next bounded slice is Step 382 - Replay Gap Regression Pack Cost Audit,
    because Step 274 consumed `90350ms` inside the foundation pack, with
    `htf-manual-next-replay-gap-browser-step273-smoke.js` at `50161ms` and
    `manual-next-session-gap-browser-step258-smoke.js` at `27270ms`.
  - Step 380 re-audited the HTF leftward-extension performance chain from
    Steps 367-379 and closed HTF target-history leftward-extension latency for
    now. The reduced-delay behavior is protected by the Step 377 standalone
    budget guard, Step 378 optional member, Step 379 combined optional pack
    path, and Step 371 attribution harness. Step 381 should run or package a
    chart-foundation regression refresh covering timeframe switching, interval
    menu parity, display-timeframe leftward history, daily/weekly/monthly
    projection, replay gap coverage, and the HTF reduced-delay budget guard.
  - Step 379 verified the combined optional target-history diagnostics pack
    path `replay-coordination,readout-producer-flow,handoff-registration,
    reduced-delay-budget`. The run executed all four optional members in order,
    kept the default eight-member pack unchanged, and the Step 377 budget guard
    passed last with `4h` `116.0ms`, `8h` `132.9ms`, `1D` `134.2ms`, and
    `1W` `137.5ms`. Step 380 should close the HTF leftward-extension
    performance chain with a short re-audit and next-slice selection.
  - Step 378 added optional target-history diagnostics pack member
    `reduced-delay-budget` for the Step 377 browser budget guard. The default
    Step 293 pack remains eight tests, existing optional members stay in order,
    and the observed optional run selected `plan members 1/8
    reduced-delay-budget` with `4h` `124.8ms`, `8h` `139.5ms`, `1D`
    `132.8ms`, and `1W` `129.9ms`. Step 379 should verify the combined
    optional member command including the new member.
  - Step 377 added a focused browser budget guard for HTF target-history
    reduced-delay behavior. The guard fails if `4h`, `8h`, `1D`, or `1W`
    target fetches fall back toward the old `500ms` window; the observed run
    measured `4h` `119.4ms`, `8h` `140.1ms`, `1D` `127.7ms`, and `1W`
    `139.7ms`, with native `100ms` scheduling verified. Step 378 should add
    this guard as an optional target-history diagnostics pack member while
    keeping default pack membership unchanged.
  - Step 376 suppressed HTF target-history `runtime-surface-check` and
    `runtime-left-extension-loaded` delayed `500ms` schedules in the
    leftward-history input bridge while preserving low-TF/native source,
    target-history-disabled, and programmatic fast-path behavior. Browser
    timing now shows `4h` `113.3ms`, `8h` `121.4ms`, `1D` `125.7ms`, and
    `1W` `120.4ms` from input to target fetch. Step 377 should add a smaller
    browser budget guard so this does not regress back to the old `500ms`
    window.
  - Step 375 added harness-only branch attribution for real HTF wheel
    scheduling. The native `100ms` branch is present with target-history
    enabled for `4h`, `8h`, `1D`, and `1W`; `8h` reached target fetch at
    `130.1ms` in the observed run, while `4h`, `1D`, and `1W` still lined up
    around `462-464ms` because `runtime-surface-check` /
    `runtime-left-extension-loaded` delayed `500ms` schedules remain active in
    the interaction window. Step 376 should narrowly suppress those runtime
    delayed schedules when an HTF native reduced-delay target-history schedule
    is already active.
  - Step 374 wired `nativeTargetHistoryDelayMs: 100` into
    `leftward-history-input-bridge.js` for native visible-range requests with
    target-history enabled. Browser measurement showed `8h`
    `inputToTargetFetchStartMs` at `132.1ms`, while `4h`, `1D`, and `1W` still
    measured around `448-479ms`, so Step 375 should attribute schedule branch
    selection for real wheel input.
  - Step 373 added pure resolver support for `nativeTargetHistoryDelayMs`.
    Native target-history visible-range scheduling can now resolve to `100ms`
    with mode `native-target-history-reduced-delay`, while bridge runtime
    wiring remains unchanged and default native target-history still resolves
    to `requestDelayMs=500` unless the future wiring passes the option.
  - Step 372 selected `native-target-history-reduced-delay-with-coalescing` as
    the bounded HTF target-history native wheel/drag scheduling policy. Future
    HTF target-history native visible-range requests should use `100ms`
    coalescing, while low-TF/native and target-history-disabled paths keep
    `requestDelayMs=500`; runtime bridge/resolver behavior is still unchanged.
  - Step 371 added low-overhead real CDP wheel-triggered runtime milestone
    attribution for `4h`, `8h`, `1D`, and `1W`. The observed run identified
    `inputToTargetFetchStartMs` around `460-536ms`, matching the existing
    `requestDelayMs=500` scheduling window, while target fetch,
    fetch-to-chart-data, and left-extension-to-readout were low.
  - Step 370 added browser/harness-only real CDP wheel measurement for `4h`,
    `8h`, `1D`, and `1W`. The first wheel attempt triggered target-history
    loading quickly for all four TFs, target request duration was effectively
    zero in the mocked harness, and source requests stayed zero. The remaining
    observed window needs low-overhead milestone attribution because canvas
    sampling can contaminate viewport/paint buckets.
  - Step 369 added browser/harness-only real chart paint visibility
    measurement for `4h`, `8h`, `1D`, and `1W`. The observed run showed
    chart signatures already changed by `viewport-projected` with
    `realChartPaintVisibleLagMs: 0`, so the large observation window came from
    harness canvas sampling rather than chart-surface paint delay. Step 370
    should measure the real drag-triggered interaction path.
  - Step 368 added a pure bottleneck owner selector for Step 367 phase
    records, consumed the observed `4h`, `8h`, `1D`, and `1W` measurement, and
    selected `target-history-real-chart-paint-visibility-measurement` as the
    next slice because the largest bucket was the test-only browser paint
    observation window while request/runtime phases stayed low.
  - Step 367 added measurement-only HTF leftward-extension browser coverage
    for `4h`, `8h`, `1D`, and `1W` after handoff runtime registration,
    separating source request, target request, chart-data replacement,
    viewport reapply, visible apply lag, browser paint lag, visual latency,
    and runtime duration while leaving runtime behavior unchanged.
  - Step 366 added optional target-history diagnostics pack member
    `handoff-registration` for the Step 365 app-registration browser smoke,
    preserving the default eight-member pack and existing optional members
    `replay-coordination` and `readout-producer-flow`.
  - Step 365 registered the replay coordination materialization handoff runtime
    in `v6/src/app.js`, injecting app-level `subscribeEvent` and
    `dispatchCommand`, preserving registration order after Manual Next and
    before Manual Previous, and adding focused browser coverage proving the
    runtime is started while Manual Next remains source `1m` driven under `8h`
    target materialization.
  - Step 364 added the plan-only app registration helper for the unwired narrow
    replay materialization runtime handoff. It defines the exact future
    `v6/src/app.js` diff for `dispatchCommand` import, runtime factory import,
    and runtime registration after Manual Next and before Manual Previous,
    plus focused Step 365 browser smoke, verification order, and rollback
    gates while keeping the runtime unregistered.
  - Step 363 added the audit-only app registration readiness helper for the
    unwired narrow replay materialization runtime handoff. It identifies the
    exact future `v6/src/app.js` import path, registration insertion point
    after Manual Next and before Manual Previous, dependency injection sources
    for `subscribeEvent`, `dispatchCommand`, and executor, rollback plan, and
    focused browser coverage while keeping the runtime unregistered.
  - Step 362 added the unwired runtime skeleton for the narrow replay
    materialization handoff. It implements the contract-shaped factory with
    injectable `subscribeEvent`, `dispatchCommand`, and executor dependencies,
    command-result wrapper helpers, start/stop cleanup, and still avoids
    `v6/src/app.js` registration.
  - Step 361 added the contract-only future runtime surface for the narrow
    replay materialization handoff. It defines factory signature, injected
    dependencies, wrapper/fallback/no-op diagnostics result shapes, app
    registration preconditions, and keeps app registration/live runtime wiring
    deferred.
  - Step 360 added the plan-only future runtime implementation plan for the
    narrow replay materialization handoff. It defines lifecycle, Manual Next
    advanced subscription cleanup, dispatch wrapper order, Step 358 executor
    invocation, rollback gates, and keeps app registration/live runtime wiring
    deferred.
  - Step 359 added the pure wiring readiness audit for the future narrow replay
    materialization runtime handoff. It identifies `v6/src/app.js` runtime
    registry before lifecycle start as the future registration point,
    `chartEntryManualNext:advanced` as the subscription surface, the
    command-dispatch wrapper surfaces, and rollback criteria, while keeping
    runtime behavior unchanged.
  - Step 358 added the pure executor harness for the future narrow replay
    materialization runtime handoff. It consumes the Step 357 plan and injected
    command results, returns a `chartData.replaceBars` intent on the happy path,
    returns named fallback gates for source `1m`, missing context/data,
    target plan/load misses, and future-only target bars, and keeps runtime
    behavior unchanged.
  - Step 357 added the plan-only narrow replay materialization runtime handoff
    helper for future owner boundary
    `runtime.replay-coordination-materialization-handoff`, defining
    `chartEntryManualNext:advanced` as trigger, command order
    `pane.getById`, `replay.getState`, `chartData.getSourceBars`,
    `barData.planTargetWindow`, `barData.loadTargetWindow`, and
    `chartData.replaceBars`, fallback gates, and forbidden surfaces without
    runtime behavior changes.
  - Step 356 audited the narrow replay materialization runtime handoff
    surfaces, selected future owner boundary
    `runtime.replay-coordination-materialization-handoff`, selected a new
    replay-coordination runtime helper, listed allowed
    `chartEntryManualNext:advanced`, `pane.getById`, `replay.getState`,
    `chartData.getSourceBars`, `barData.planTargetWindow`,
    `barData.loadTargetWindow`, and `chartData.replaceBars` surfaces, and kept
    runtime behavior unchanged.
  - Step 355 closed the diagnostics/readout observability chain, stopped adding
    observability-only diagnostics UI or pack wiring for now, and selected
    `narrow-replay-materialization-runtime-handoff-readiness-audit` as the next
    bounded target-materialization foundation slice.
  - Step 354 verified optional target-history diagnostics pack combination
    `replay-coordination,readout-producer-flow`, confirming Step 337 then Step
    352 browser smoke execution order while keeping the default pack and
    standalone optional members unchanged.
  - Step 353 added optional target-history diagnostics regression pack member
    `readout-producer-flow` for the Step 352 producer-flow readout browser
    smoke while keeping the default eight-member pack and existing
    `replay-coordination` optional member unchanged.
  - Step 352 added browser/static regression coverage proving real
    Display-Timeframe materialization, Manual Next, and Auto Play producer
    flows update the pane-status materialization diagnostics readout without
    direct diagnostics update dispatch, producer runtime changes, target
    loading, replay cursor, chart-data, viewport, request sizing, or fast-path
    behavior changes.
  - Step 351 implemented controlled pane-status diagnostics readout DOM wiring:
    hidden pane-local containers, `getSnapshot`/`snapshotReady` consumption,
    Step 349 view-model routing, and hidden/collapsed rendering without
    producer runtime, target loading, replay cursor, chart-data, viewport,
    request sizing, or fast-path behavior changes.
  - Step 350 defined the plan-only pane-status DOM wiring contract, including
    container placement, dataset attributes, command/event consumption,
    Step 349 view-model routing, rendering rules, and rollback criteria.
  - Step 349 added a pure shell readout view model that maps diagnostics
    snapshots into hidden/collapsed states and first-visible rows while keeping
    internal-only fields hidden and visible DOM UI unwired.
  - Step 348 selected `shell.pane-status-readout` as the
    developer-collapsed pane-local diagnostics readout owner, listed first
    visible/internal-only fields, defined hide/collapse rules, and kept visible
    UI unwired.
  - Step 347 added browser/runtime-read coverage proving Display-Timeframe,
    Manual Next, and Auto Play flows update diagnostics snapshots readable
    through `getSnapshot`, without visible UI changes.
  - Step 346 wired producer event subscriptions inside the diagnostics runtime
    for Display-Timeframe, Manual Next, and Auto Play events, using the mapper
    and update path without producer runtime or UI changes.
  - Step 345 added pure producer payload mappers from Display-Timeframe, Manual
    Next, and Auto Play events into diagnostics update payloads, without live
    subscriptions, producer runtime dispatches, or UI changes.
  - Step 344 added `targetMaterializationReplayDiagnostics.updateSnapshot` with
    normalization, validation, cloned readback, rejected-update safety, and no
    producer subscriptions or UI changes.
  - Step 343 defined the pure producer/consumer wiring plan from
    Display-Timeframe, Manual Next, and Auto Play events into a future
    diagnostics update-snapshot surface, without live subscriptions or UI
    changes.
  - Step 342 added the smallest read-only diagnostics runtime state surface,
    `getSnapshot` command, `snapshotReady` event, and app registration without
    visible UI or replay/target-loading behavior changes.
  - Step 341 defined the read-only diagnostics/readout owner contract,
    diagnostic fields, shell consumption rules, and forbidden actions before
    runtime state wiring.
  - Step 340 selected
    `target-materialization-replay-coordination-diagnostics-readout` as the
    next bounded slice before any narrow runtime handoff.
  - Step 339 added optional target-history pack member `replay-coordination`
    for the Step 337 replay coordination browser smoke while preserving the
    default eight-member pack.
  - Step 338 selected
    `target-history-pack-replay-coordination-member` as the next bounded
    target-timeframe materialization slice before broader runtime changes.
  - Step 337 verified manual next, autoplay, no-bar gap skipping, fallback,
    and source cursor append filtering while `8h` target materialization is
    active.
  - Step 336 verified browser-visible `8h`, `1D`, and `1W` target
    materialization, source preservation when returning to `1m`,
    target-data-missing fallback, responsiveness, and shell/runtime boundary
    ownership.
  - Step 335 wired Display-Timeframe Runtime target materialization through
    source cursor read, source-bar preservation, bar-data target plan/load,
    source-cursor target-bar reveal filtering, and chart-data replacement with
    `preserveSource: true`.
  - Step 334 defined the read-only display-timeframe target materialization
    wiring plan: owner, command/data sequence, fallback gates, rollback
    criteria, and forbidden actions before runtime handoff wiring.
  - Step 333 verified the existing display-timeframe, bar-data, chart-data,
    replay cursor, and target-bar reveal policy surfaces required by the pure
    handoff plan and selected wiring plan next.
  - Step 332 selected
    `display-timeframe-target-materialization-readiness-audit` as the next
    bounded slice before runtime materialization behavior wiring.
  - Step 331 mapped display materialization intent to existing bar-data and
    chart-data owner surfaces and recorded the first future wiring point
    preconditions without runtime wiring.
  - Step 330 selected
    `replay-coordination-materialization-pure-handoff-plan` as the next
    bounded slice before runtime materialization wiring.
  - Step 329 defined the replay coordination materialization owner contract,
    participant read/write boundaries, and source-cursor target-bar no-future
    reveal policy.
  - Step 328 selected
    `replay-coordination-materialization-owner-contract` as the next bounded
    slice.
  - Step 327 re-measured `8h`, `1D`, and `1W` target-history responsiveness
    after the fast path and reached `materialization-ready`.
  - Step 326 added the programmatic target-history leftward request fast path.

### Current Product / Engineering Direction

- V6 is now the active foundation for an open-source-oriented personal
  backtesting/journal workstation for SMC/ICT discretionary traders, especially
  prop firm traders.
- Current foundation priority remains chart basics: chart loading, TF switching,
  leftward history extension, date range entry, replay, multi-pane, pane-local
  reset, and visible K-line latency.
- Indicators, main/sub-pane indicator areas, simulated trading/order tickets,
  prop-firm workflow, and journal workflows remain later work unless a bounded
  owner contract says otherwise.
- Keep the modularity rule strict: feature work must land through its owner
  boundary and public command/event contract.

### Latest Fixes To Preserve

- Target-history materialization transition boundary:
  high-timeframe target-history responsiveness is within budget after the
  fast path. Step 329 defines the owner contract, and Step 330 selects a pure
  handoff plan as the next bounded slice. Step 331 defines that pure handoff
  plan. Step 332 selects a read-only readiness audit as the next bounded slice.
  Step 333 completes that audit and selects a wiring plan next. Step 334
  defines that wiring plan and selects runtime handoff wiring next. Step 335
  implements the first runtime handoff slice inside Display-Timeframe Runtime.
  Step 336 verifies that handoff in browser-visible `8h`, `1D`, and `1W`
  materialization flows, including source preservation and fallback. Replay
  remains source `1m` driven. Step 337 verifies manual next/autoplay replay
  coordination while target materialization is active and fixes HTF append
  filtering to use the replay source cursor instead of the projected bucket
  timestamp. Step 338 selects target-history pack replay coordination member
  integration as the next bounded slice, keeping runtime behavior unchanged.
  Step 339 implements that pack member as optional `replay-coordination` so the
  default eight-member target-history pack stays unchanged. Step 340 selects
  diagnostics/readout ownership as the next slice before any runtime handoff.
  Step 341 defines that read-only contract and keeps runtime behavior
  unchanged. Step 342 adds the read-only diagnostics runtime snapshot surface
  and still keeps visible UI, replay cursor movement, target loading,
  chart-data writes, viewport behavior, and request sizing unchanged. Step 343
  defines the diagnostics producer/consumer wiring plan and still avoids live
  subscriptions, visible UI, replay cursor movement, target loading, chart-data
  writes, viewport behavior, and request sizing changes. Step 344 adds the
  bounded diagnostics update command surface and still avoids producer
  subscriptions, visible UI, replay cursor movement, target loading, chart-data
  writes, viewport behavior, and request sizing changes. Step 345 adds pure
  producer payload mappers and still avoids live subscriptions, producer
  runtime dispatches, visible UI, replay cursor movement, target loading,
  chart-data writes, viewport behavior, and request sizing changes. Step 346
  wires producer event subscriptions inside the diagnostics runtime and still
  avoids producer runtime changes, visible UI, replay cursor movement, target
  loading, chart-data writes, viewport behavior, and request sizing changes.
  Step 347 proves that the browser can read diagnostics snapshots after display
  materialization, manual next, and autoplay flows, still without visible UI
  changes. Step 348 defines the first readout owner and visibility plan as a
  plan-only `shell.pane-status-readout` developer-collapsed pane-local readout,
  still without visible UI, producer runtime, target loading, replay cursor,
  chart-data, viewport, request sizing, or fast-path behavior changes. Step
  349 adds the pure shell readout view model for hidden/collapsed diagnostics
  states and first-visible rows, still without DOM UI wiring or runtime
  behavior changes. Step 350 defines the plan-only DOM wiring contract for
  `shell.pane-status-readout`, still without visible UI wiring or runtime
  behavior changes. Step 351 implements the controlled pane-status DOM wiring
  and still avoids producer runtime, target loading, replay cursor, chart-data,
  viewport, request sizing, and fast-path behavior changes. Step 352 verifies
  that real Display-Timeframe, Manual Next, and Auto Play producer flows update
  that pane-status readout through the diagnostics runtime and still avoids
  direct diagnostics update dispatch, producer runtime changes, target loading,
  replay cursor, chart-data, viewport, request sizing, and fast-path behavior
  changes. Step 353 exposes that producer-flow readout browser coverage as
  optional target-history pack member `readout-producer-flow`, keeping the
  default pack and existing `replay-coordination` optional member unchanged.
  Step 354 verifies the combined optional pack path
  `replay-coordination,readout-producer-flow`, confirming Step 337 then Step
  352 execution order without runtime behavior changes. Step 355 closes this
  diagnostics/readout observability chain and selects
  `narrow-replay-materialization-runtime-handoff-readiness-audit` next, still
  without runtime behavior changes. Step 356 audits that readiness slice,
  selects `runtime.replay-coordination-materialization-handoff` as the future
  owner boundary, selects a new replay-coordination runtime helper, lists the
  exact event/command surfaces, keeps diagnostics read-only, and still avoids
  runtime behavior changes. Step 357 defines the plan-only trigger, command
  sequence, fallback gates, and forbidden surfaces for that future helper, still
  without runtime behavior changes. Step 358 adds a pure executor harness for
  that plan, returning injected-result decisions and fallback gates without
  runtime wiring. Step 359 audits the future live wiring surfaces and selects a
  plan-only runtime implementation plan next, still without runtime wiring.
  Step 360 defines that runtime plan and selects a runtime contract next, still
  without app registration or live runtime wiring. Step 361 defines that
  runtime contract and selects an unwired runtime skeleton next, still without
  app registration or live runtime wiring. Step 362 adds that unwired runtime
  skeleton and selects app registration readiness audit next, still without app
  registration. Step 363 audits the exact future app import/register position,
  dependency injection source, rollback plan, and focused browser coverage, and
  selects an app registration plan next, still without app registration. Step
  364 defines that app registration plan and selects live app registration
  next, still without app registration. Step 365 registers the runtime in
  `v6/src/app.js` and selects optional regression pack member integration next.
  Step 366 adds optional pack member `handoff-registration` and selects HTF
  leftward-extension performance measurement next.
- Session setup datetime fix:
  `datetime-local` values are parsed as chart/data-axis literal UTC. A user
  input like `2026-05-04T09:30` stores `2026-05-04T09:30:00.000Z`, not the
  browser-local shifted time.
- Session switch price-scale fix:
  opening a different price regime or pressing reset view should autoscale the
  pane instead of inheriting the prior session price axis.
- Wheel zoom leftward prepend stability:
  wheel-initiated leftward history prepend has a short stabilization recheck so
  visible K-lines do not jump after Lightweight Charts settles.
- Manual-next session gap fix:
  replay now skips no-bar session breaks to the next available source K-line.
  The browser smoke covers 1m, 5m, and 15m display paths. HTF chart timestamps
  may still show bucket starts such as `17:59`; verify the projected bucket's
  source bar reached `18:00`, not that the HTF bucket timestamp equals `18:00`.

### Runtime / Server At Handoff

- API process was listening at `127.0.0.1:8766`:
  `/home/leo/miniconda3/bin/python3 /home/leo/myworkspace/trading/backtesting/v4/v4_api.py`
- Static web process was listening at `127.0.0.1:8002`:
  `python3 -m http.server 8002 --bind 127.0.0.1`
- Browser URL:
  `http://127.0.0.1:8002/v6/index.html`
- Health URL:
  `http://127.0.0.1:8766/v4/health`
- Windows one-click entry remains:
  `v6/start_windows.bat`
- Windows PowerShell entry:
  `powershell -NoProfile -ExecutionPolicy Bypass -File v6/start_windows.ps1 start`

### Restart Checklist

1. Confirm branch and cleanliness:
   - `git branch --show-current`
   - `git status --short`
2. Start or verify services:
   - API: `http://127.0.0.1:8766/v4/health`
   - Web: `http://127.0.0.1:8002/v6/index.html`
3. Open `v6/TODO.md` and this handoff file before selecting the next step.
4. If continuing planned work, start with Step 391:
   chart foundation runtime refresh selection.
5. If continuing the replay gap bug, manually spot-check:
   - create a session crossing `2026-06-01 17:00`;
   - replay through the break on 1m, 5m, and 15m display TF;
   - confirm replay cursor skips to `18:00` instead of sticking at `16:59`.

### Last Verified Commands

- `node v6/tests/narrow-replay-materialization-runtime-handoff-readiness-step356-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-readiness-boundary-step356-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-readiness-closeout-step356-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-plan-step357-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-plan-boundary-step357-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-plan-closeout-step357-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-executor-step358-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-executor-boundary-step358-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-executor-closeout-step358-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-wiring-readiness-step359-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-wiring-readiness-boundary-step359-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-wiring-readiness-closeout-step359-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-plan-step360-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-plan-boundary-step360-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-plan-closeout-step360-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-contract-step361-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-contract-boundary-step361-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-contract-closeout-step361-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-handoff-step362-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-handoff-boundary-step362-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-handoff-closeout-step362-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-readiness-step363-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-readiness-boundary-step363-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-readiness-closeout-step363-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-plan-step364-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-plan-boundary-step364-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-plan-closeout-step364-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-closeout-step365-static-smoke.js`
- `node v6/tests/target-history-pack-handoff-registration-member-step366-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-handoff-pack-member-closeout-step366-static-smoke.js`
- `node v6/tests/high-timeframe-leftward-extension-performance-after-handoff-step367-static-smoke.js`
- `node v6/tests/high-timeframe-leftward-extension-performance-after-handoff-browser-step367-smoke.js`
- `node v6/tests/high-timeframe-leftward-extension-bottleneck-owner-selection-step368-smoke.js`
- `node v6/tests/high-timeframe-leftward-extension-bottleneck-owner-selection-boundary-step368-static-smoke.js`
- `node v6/tests/high-timeframe-leftward-extension-real-chart-paint-visibility-browser-step369-smoke.js`
- `node v6/tests/high-timeframe-leftward-extension-real-chart-paint-visibility-boundary-step369-static-smoke.js`
- `node v6/tests/high-timeframe-drag-triggered-leftward-extension-interaction-browser-step370-smoke.js`
- `node v6/tests/high-timeframe-drag-triggered-leftward-extension-interaction-boundary-step370-static-smoke.js`
- `node v6/tests/high-timeframe-drag-triggered-low-overhead-runtime-milestones-browser-step371-smoke.js`
- `node v6/tests/high-timeframe-drag-triggered-low-overhead-runtime-milestones-boundary-step371-static-smoke.js`
- `node v6/tests/high-timeframe-target-history-request-scheduling-policy-selection-step372-smoke.js`
- `node v6/tests/high-timeframe-target-history-request-scheduling-policy-selection-boundary-step372-static-smoke.js`
- `node v6/tests/leftward-history-request-schedule-step373-smoke.js`
- `node v6/tests/leftward-history-request-schedule-boundary-step373-static-smoke.js`
- `node v6/tests/leftward-history-input-bridge-native-target-delay-step374-smoke.js`
- `node v6/tests/leftward-history-input-bridge-native-target-delay-boundary-step374-static-smoke.js`
- `node v6/tests/leftward-history-input-bridge-schedule-branch-attribution-step375-smoke.js`
- `node v6/tests/leftward-history-input-bridge-schedule-branch-attribution-boundary-step375-static-smoke.js`
- `node v6/tests/leftward-history-input-bridge-runtime-delayed-suppression-step376-smoke.js`
- `node v6/tests/leftward-history-input-bridge-runtime-delayed-suppression-boundary-step376-static-smoke.js`
- `node v6/tests/leftward-history-input-bridge-fast-path-step326-smoke.js`
- `node v6/tests/high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke.js`
- `node v6/tests/high-timeframe-target-history-reduced-delay-budget-boundary-step377-static-smoke.js`
- `node v6/tests/target-history-pack-reduced-delay-budget-member-step378-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=reduced-delay-budget node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-pack-reduced-delay-optional-combination-step379-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow,handoff-registration,reduced-delay-budget node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/high-timeframe-leftward-extension-performance-chain-reaudit-step380-static-smoke.js`
- `node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`
- `node v6/tests/high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke.js`
- `node v6/tests/chart-foundation-regression-refresh-step381-static-smoke.js`
- `node v6/tests/replay-gap-regression-pack-cost-audit-step382-static-smoke.js`
- `node v6/tests/replay-gap-manual-path-timing-probe-step383-smoke.js`
- `node v6/tests/replay-gap-manual-path-timing-probe-step383-static-smoke.js`
- `node v6/tests/replay-gap-near-gap-manual-fixture-plan-step384-static-smoke.js`
- `node v6/tests/replay-gap-near-gap-manual-fixture-step385-smoke.js`
- `node v6/tests/replay-gap-near-gap-manual-fixture-step385-static-smoke.js`
- `node v6/tests/replay-gap-fast-pack-integration-selection-step386-static-smoke.js`
- `node v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js`
- `node v6/tests/replay-gap-fast-browser-regression-pack-step387-static-smoke.js`
- `node v6/tests/foundation-pack-replay-gap-fast-full-selection-step388-static-smoke.js`
- `node v6/tests/foundation-pack-replay-gap-fast-full-mode-step389-static-smoke.js`
- `node v6/tests/foundation-replay-gap-mode-closeout-step390-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=handoff-registration node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow,handoff-registration node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-materialization-diagnostics-readout-chain-closeout-step355-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Node emitted the existing typeless package warning for ES module smoke files;
the commands passed.

### Next Work Recommendation

- Do not start indicators or trading simulation yet.
- Recommended next action is Step 391 - Chart Foundation Runtime Refresh
  Selection.
- Compare the latest default fast Step 276 runtime `44597ms` against the older
  full Step 381 runtime `105292ms`, then decide whether another browser runtime
  refresh is needed before returning to feature work.

## Current State

- Branch: `v6/fx-replay-workstation`
- Current V6 step state: Step 211 completed.
- Next planned step: Step 212 - Top-Toolbar Active-Pane Symbol Presentation Sync.
- Worktree expectation at handoff: clean.

The latest completed work is Next Chart Slice Selection:

- `V6_NEXT_CHART_SLICE_SELECTION_STEP211.md` selects Top-Toolbar
  Active-Pane Symbol Presentation Sync as the next bounded chart-facing slice.
- Step 206-208 active-pane display-timeframe work and Step 210 pane-local
  header isolation are acknowledged as the immediate foundation.
- Step 212 should update `data-v6-top-symbol` from active pane state as
  read-only shell presentation.
- Custom intervals, interval sync, symbol picker UI, indicators, Pine Script,
  and trading/order behavior remain out of scope.

Browser tests should be run sequentially because the current smoke harnesses
share browser/CDP resources.

## Restart Reading Order

After restarting the server or assistant context, read these first:

1. `v6/TODO.md`
2. `v6/docs/INDEX.md`
3. `v6/docs/V6_HANDOFF.md`
4. `v6/sessions/session_20260707_step103_chart_control_bridge_owner_contract.md`
5. `v6/sessions/session_20260707_step104_chart_control_bridge_integration_audit.md`
6. `v6/sessions/session_20260707_step105_chart_control_bridge_browser_regression_audit.md`
7. `v6/sessions/session_20260707_step106_dashboard_row_action_isolation_reaudit.md`
8. `v6/sessions/session_20260707_step107_dashboard_visible_row_action_browser_coverage_audit.md`
9. `v6/sessions/session_20260707_step108_dashboard_session_browser_regression_pack_audit.md`
10. `v6/sessions/session_20260707_step109_next_dashboard_row_action_exposure_readiness_audit.md`
11. `v6/sessions/session_20260707_step110_journal_row_action_owner_surface_readiness_audit.md`
12. `v6/sessions/session_20260707_step111_journal_row_action_session_context_contract.md`
13. `v6/sessions/session_20260707_step112_hidden_journal_row_action_harness.md`
14. `v6/sessions/session_20260707_step113_hidden_journal_row_action_browser_harness.md`
15. `v6/sessions/session_20260707_step114_journal_surface_ready_flag_audit.md`
16. `v6/sessions/session_20260707_step115_journal_row_action_exposure_gate_audit.md`
17. `v6/sessions/session_20260707_step116_journal_row_action_visibility_wiring.md`
18. `v6/sessions/session_20260707_step117_dashboard_journal_row_action_regression_pack_audit.md`
19. `v6/sessions/session_20260707_step118_workstation_chart_presentation_reaudit.md`
20. `v6/sessions/session_20260707_step119_workstation_chart_slice_selection.md`
21. `v6/sessions/session_20260707_step120_left_drawing_rail_reservation.md`
22. `v6/sessions/session_20260707_step121_workstation_rail_regression_audit.md`
23. `v6/sessions/session_20260707_step122_workstation_chart_slice_selection.md`
24. `v6/sessions/session_20260707_step123_bottom_account_chrome_reservation.md`
25. `v6/sessions/session_20260707_step124_bottom_chrome_regression_audit.md`
26. `v6/sessions/session_20260707_step125_workstation_chart_slice_selection.md`
27. `v6/sessions/session_20260707_step126_right_rail_session_settings_panel_reservation.md`
28. `v6/sessions/session_20260707_step127_right_rail_session_settings_panel_regression_audit.md`
29. `v6/sessions/session_20260707_step128_workstation_chart_slice_selection.md`
30. `v6/sessions/session_20260707_step129_workstation_ui_parity_gap_reaudit.md`
31. `v6/sessions/session_20260707_step130_workstation_chart_slice_selection.md`
32. `v6/sessions/session_20260707_step131_diagnostics_visibility_cleanup.md`
33. `v6/sessions/session_20260707_step132_workstation_chart_slice_selection.md`
34. `v6/sessions/session_20260707_step133_session_settings_owner_contract.md`
35. `v6/sessions/session_20260707_step134_workstation_chart_slice_selection.md`
36. `v6/sessions/session_20260707_step135_screenshot_export_owner_contract.md`
37. `v6/sessions/session_20260707_step136_workstation_chart_slice_selection.md`
38. `v6/sessions/session_20260707_step137_indicators_owner_contract.md`
39. `v6/sessions/session_20260707_step138_workstation_chart_slice_selection.md`
40. `v6/sessions/session_20260707_step139_drawing_action_history_owner_contract.md`
41. `v6/sessions/session_20260707_step140_workstation_chart_slice_selection.md`
42. `v6/sessions/session_20260707_step141_account_trading_owner_contract.md`
43. `v6/sessions/session_20260707_step142_workstation_chart_slice_selection.md`
44. `v6/sessions/session_20260707_step143_chart_foundation_reprioritization.md`
45. `v6/sessions/session_20260707_step144_database_kline_import_boundary.md`
46. `v6/sessions/session_20260707_step145_replay_kline_chart_flow.md`
47. `v6/sessions/session_20260708_step146_reset_view_kxg_flow.md`
48. `v6/sessions/session_20260708_step147_multi_pane_chart_foundation.md`
49. `v6/sessions/session_20260708_step148_leftward_historical_extension.md`
50. `v6/sessions/session_20260708_step149_drag_triggered_history_extension.md`
51. `v6/sessions/session_20260708_step150_replay_speed_under_history_extension.md`
52. `v6/sessions/session_20260708_step151_continuous_leftward_history.md`
53. `v6/sessions/session_20260708_step152_auto_play_continuous_history.md`
54. `v6/sessions/session_20260708_step153_crosshair_ohlc_readout.md`
55. `v6/sessions/session_20260708_step154_multi_pane_crosshair_readout.md`
56. `v6/sessions/session_20260708_step155_multi_pane_leftward_history.md`
57. `v6/sessions/session_20260708_step156_multi_pane_replay_append.md`
58. `v6/sessions/session_20260708_step157_multi_pane_replay_viewport_projection.md`
59. `v6/sessions/session_20260708_step158_chart_foundation_integration_reaudit.md`
60. `v6/sessions/session_20260708_step159_chart_foundation_next_slice_selection.md`
61. `v6/sessions/session_20260708_step160_layout_menu_owner_binding.md`
62. `v6/sessions/session_20260708_step161_layout_pane_surface_reflow.md`
63. `v6/sessions/session_20260708_step162_layout_pane_data_bootstrap.md`
64. `v6/sessions/session_20260708_step163_pane_local_reset_view_controls.md`
65. `v6/sessions/session_20260708_step164_layout_variant_geometry.md`
66. `v6/sessions/session_20260708_step165_pane_resize_drag.md`
67. `v6/docs/V6_DASHBOARD_SESSION_BROWSER_REGRESSION_PACK_AUDIT.md`
68. `v6/docs/V6_DASHBOARD_JOURNAL_ROW_ACTION_REGRESSION_PACK_AUDIT.md`
69. `v6/docs/V6_WORKSTATION_CHART_PRESENTATION_REAUDIT.md`
70. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION.md`
71. `v6/docs/V6_LEFT_DRAWING_RAIL_RESERVATION.md`
72. `v6/docs/V6_WORKSTATION_RAIL_REGRESSION_AUDIT.md`
73. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP122.md`
74. `v6/docs/V6_BOTTOM_ACCOUNT_CHROME_RESERVATION.md`
75. `v6/docs/V6_BOTTOM_CHROME_REGRESSION_AUDIT.md`
76. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP125.md`
77. `v6/docs/V6_RIGHT_RAIL_SESSION_SETTINGS_PANEL_RESERVATION.md`
78. `v6/docs/V6_RIGHT_RAIL_SESSION_SETTINGS_PANEL_REGRESSION_AUDIT.md`
79. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP128.md`
80. `v6/docs/V6_WORKSTATION_UI_PARITY_GAP_REAUDIT.md`
81. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP130.md`
82. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP132.md`
83. `v6/docs/V6_SESSION_SETTINGS_OWNER_CONTRACT.md`
84. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP134.md`
85. `v6/docs/V6_SCREENSHOT_EXPORT_OWNER_CONTRACT.md`
86. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP136.md`
87. `v6/docs/V6_INDICATORS_OWNER_CONTRACT.md`
88. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP138.md`
89. `v6/docs/V6_DRAWING_ACTION_HISTORY_OWNER_CONTRACT.md`
90. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP140.md`
91. `v6/docs/V6_ACCOUNT_TRADING_OWNER_CONTRACT.md`
92. `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP142.md`
93. `v6/docs/V6_CHART_FOUNDATION_REPRIORITIZATION_STEP143.md`
94. `v6/docs/V6_DATABASE_KLINE_IMPORT_BOUNDARY_STEP144.md`
95. `v6/docs/V6_REPLAY_KLINE_CHART_FLOW_STEP145.md`
96. `v6/docs/V6_RESET_VIEW_KXG_FLOW_STEP146.md`
97. `v6/docs/V6_MULTI_PANE_CHART_FOUNDATION_STEP147.md`
98. `v6/docs/V6_LEFTWARD_HISTORICAL_EXTENSION_STEP148.md`
99. `v6/docs/V6_DRAG_TRIGGERED_HISTORY_EXTENSION_STEP149.md`
100. `v6/docs/V6_REPLAY_SPEED_UNDER_HISTORY_EXTENSION_STEP150.md`
101. `v6/docs/V6_CONTINUOUS_LEFTWARD_HISTORY_STEP151.md`
102. `v6/docs/V6_AUTO_PLAY_CONTINUOUS_HISTORY_STEP152.md`
103. `v6/docs/V6_CROSSHAIR_OHLC_READOUT_STEP153.md`
104. `v6/docs/V6_MULTI_PANE_CROSSHAIR_READOUT_STEP154.md`
105. `v6/docs/V6_MULTI_PANE_LEFTWARD_HISTORY_STEP155.md`
106. `v6/docs/V6_MULTI_PANE_REPLAY_APPEND_STEP156.md`
107. `v6/docs/V6_MULTI_PANE_REPLAY_VIEWPORT_PROJECTION_STEP157.md`
108. `v6/docs/V6_CHART_FOUNDATION_INTEGRATION_REAUDIT_STEP158.md`
109. `v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP159.md`
110. `v6/docs/V6_LAYOUT_MENU_OWNER_BINDING_STEP160.md`
111. `v6/docs/V6_LAYOUT_PANE_SURFACE_REFLOW_STEP161.md`
112. `v6/docs/V6_LAYOUT_PANE_DATA_BOOTSTRAP_STEP162.md`
113. `v6/docs/V6_PANE_LOCAL_RESET_VIEW_CONTROLS_STEP163.md`
114. `v6/docs/V6_LAYOUT_VARIANT_GEOMETRY_STEP164.md`
115. `v6/docs/V6_PANE_RESIZE_DRAG_STEP165.md`
116. `v6/docs/V6_CHART_PRESENTATION_SURFACE_AUDIT.md`
117. `v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md`
118. `v6/docs/V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md`
119. `v6/docs/V6_NEXT_CHART_SLICE_SELECTION_STEP205.md`
120. `v6/docs/V6_PANE_LOCAL_DISPLAY_TIMEFRAME_UI_READINESS_STEP206.md`
121. `v6/docs/V6_DISPLAY_TIMEFRAME_TARGET_SOURCE_INTEGRATION_STEP207.md`
122. `v6/docs/V6_DISPLAY_TIMEFRAME_ACTIVE_PANE_UI_STATE_SYNC_STEP208.md`
123. `v6/docs/V6_NEXT_CHART_SLICE_SELECTION_STEP209.md`
124. `v6/docs/V6_PANE_LOCAL_HEADER_STATE_SYNC_STEP210.md`
125. `v6/docs/V6_NEXT_CHART_SLICE_SELECTION_STEP211.md`
126. `v6/sessions/session_20260708_step205_next_chart_slice_selection.md`
127. `v6/sessions/session_20260708_step206_pane_local_display_timeframe_ui_readiness.md`
128. `v6/sessions/session_20260708_step207_display_timeframe_target_source_integration.md`
129. `v6/sessions/session_20260708_step208_display_timeframe_active_pane_ui_state_sync.md`
130. `v6/sessions/session_20260708_step209_next_chart_slice_selection.md`
131. `v6/sessions/session_20260708_step210_pane_local_header_state_sync.md`
132. `v6/sessions/session_20260708_step211_next_chart_slice_selection.md`

## Next Step

Step 212 should focus on Top-Toolbar Active-Pane Symbol Presentation Sync.

Keep Step 212 bounded:

- read `V6_NEXT_CHART_SLICE_SELECTION_STEP211.md`,
  `V6_PANE_LOCAL_HEADER_STATE_SYNC_STEP210.md`, and
  `session_20260708_step211_next_chart_slice_selection.md`;
- update `data-v6-top-symbol` from active pane instrument as read-only
  shell-owned presentation;
- initialize from `PANE_COMMANDS.GET_ACTIVE` and subscribe to active-pane /
  active symbol changes;
- do not add symbol picker UI, comparison symbols, custom intervals, interval
  sync, indicators, Pine Script, or trading/order behavior.

## Critical Boundaries

V6 exists because V5 replay viewport/manual-anchor behavior became structurally
unreliable. Do not patch V5 replay behavior as a substitute for V6 work.

Preserve these V6 rules:

- UI dispatches commands and subscribes to events.
- Only chart runtime writes chart series.
- Only bar data runtime requests and caches bars.
- Only replay runtime owns replay cursor and reveal state.
- Creating a replay session must not load a full date range into chart state.
- Dashboard/session metadata work must not become a hidden cross-module control
  path into chart, bars, replay, viewport, orders, journal, or calendar.

For the current Recent Sessions row actions:

- Summary: enabled, read-only metadata-only, owner `session-summary`.
- Stats: enabled, read-only metadata/unavailable metrics, owner
  `session-analytics`.
- Copy: enabled, metadata-only, owner `session-repository`.
- Journal: enabled, journal-owned surface, owner `journal-runtime`.
- Order: disabled/contract-ready, owner `orders-runtime`.
- Calendar: disabled/contract-ready, owner `calendar-runtime`.

## Key Tests

Run these before committing Step 159 work:

- `node v6/tests/chart-foundation-integration-reaudit-step158-smoke.js`
- `node v6/tests/multi-pane-replay-viewport-projection-step157-smoke.js`
- `node v6/tests/multi-pane-replay-viewport-projection-browser-step157-smoke.js`
- `node v6/tests/multi-pane-replay-viewport-history-step157-smoke.js`
- `node v6/tests/multi-pane-replay-append-step156-smoke.js`
- `node v6/tests/multi-pane-replay-append-browser-step156-smoke.js`
- `node v6/tests/multi-pane-leftward-history-step155-smoke.js`
- `node v6/tests/multi-pane-leftward-history-browser-step155-smoke.js`
- `node v6/tests/multi-pane-crosshair-readout-step154-smoke.js`
- `node v6/tests/multi-pane-crosshair-readout-browser-step154-smoke.js`
- `node v6/tests/crosshair-ohlc-readout-browser-step153-smoke.js`
- `node v6/tests/status-readout-controller-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/auto-play-continuous-history-step152-smoke.js`
- `node v6/tests/auto-play-continuous-history-browser-step152-smoke.js`
- `node v6/tests/chart-entry-auto-play-runtime-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/continuous-leftward-history-step151-smoke.js`
- `node v6/tests/continuous-leftward-history-browser-step151-smoke.js`
- `node v6/tests/continuous-leftward-history-pane-isolation-step151-smoke.js`
- `node v6/tests/replay-speed-history-inflight-step150-smoke.js`
- `node v6/tests/replay-speed-history-extension-browser-step150-smoke.js`
- `node v6/tests/leftward-history-hardening-step149-smoke.js`
- `node v6/tests/drag-triggered-history-extension-browser-step149-smoke.js`
- `node v6/tests/leftward-history-extension-step148-smoke.js`
- `node v6/tests/leftward-history-input-bridge-step148-smoke.js`
- `node v6/tests/leftward-history-extension-browser-step148-smoke.js`
- `node v6/tests/workstation-chart-surface-multi-pane-step147-smoke.js`
- `node v6/tests/multi-pane-chart-foundation-step147-smoke.js`
- `node v6/tests/reset-view-kxg-flow-step146-smoke.js`
- `node v6/tests/reset-view-kxg-flow-browser-step146-smoke.js`
- `node v6/tests/replay-kline-chart-flow-step145-smoke.js`
- `node v6/tests/replay-kline-chart-flow-browser-step145-smoke.js`
- `node v6/tests/database-kline-import-boundary-step144-smoke.js`
- `node v6/tests/database-bars-adapter-smoke.js`
- `node v6/tests/chart-foundation-reprioritization-step143-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step142-smoke.js`
- `node v6/tests/account-trading-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step140-smoke.js`
- `node v6/tests/drawing-action-history-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step138-smoke.js`
- `node v6/tests/indicators-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step136-smoke.js`
- `node v6/tests/screenshot-export-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step134-smoke.js`
- `node v6/tests/session-settings-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step132-smoke.js`
- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step130-smoke.js`
- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step128-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-browser-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step125-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/bottom-account-chrome-browser-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step122-smoke.js`
- `node v6/tests/workstation-rail-regression-audit-browser-smoke.js`
- `node v6/tests/left-drawing-rail-browser-smoke.js`
- `node v6/tests/right-utility-rail-browser-smoke.js`
- `node v6/tests/journal-row-action-exposure-gate-audit-smoke.js`
- `node v6/tests/journal-surface-ready-flag-audit-smoke.js`
- `node v6/tests/hidden-journal-row-action-browser-smoke.js`
- `node v6/tests/hidden-journal-row-action-harness-smoke.js`
- `node v6/tests/journal-row-action-session-context-contract-smoke.js`
- `node v6/tests/journal-row-action-owner-surface-readiness-audit-smoke.js`
- `node v6/tests/next-dashboard-row-action-exposure-readiness-audit-smoke.js`
- `node v6/tests/dashboard-session-browser-regression-pack-audit-smoke.js`
- `node v6/tests/dashboard-visible-row-action-browser-coverage-audit-smoke.js`
- `node v6/tests/dashboard-row-action-isolation-reaudit-smoke.js`
- `node v6/tests/chart-control-bridge-browser-regression-audit-smoke.js`
- `node v6/tests/chart-control-bridge-integration-audit-smoke.js`
- `node v6/tests/chart-control-bridge-contract-smoke.js`
- `node v6/tests/chart-surface-contract-integration-audit-smoke.js`
- `node v6/tests/chart-surface-contract-smoke.js`
- `node v6/tests/workstation-replay-chart-reentry-audit-smoke.js`
- `node v6/tests/session-dashboard-readiness-audit-smoke.js`
- `node v6/tests/recent-sessions-row-action-contract-audit-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/orders-contract-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/calendar-contract-smoke.js`
- `node v6/tests/session-journal-row-action-browser-smoke.js`
- `node v6/tests/dashboard-journal-row-action-regression-pack-audit-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-smoke.js`

For Summary/Stats/Copy regression:

- `node v6/tests/session-copy-contract-smoke.js`
- `node v6/tests/session-copy-action-browser-smoke.js`
- `node v6/tests/session-analytics-contract-smoke.js`
- `node v6/tests/session-analytics-surface-model-smoke.js`
- `node v6/tests/session-analytics-surface-browser-smoke.js`
- `node v6/tests/session-summary-surface-model-smoke.js`
- `node v6/tests/session-summary-surface-browser-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`

For broader dashboard/session regression:

- `node v6/tests/quick-session-flow-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

For workstation replay/chart re-entry, select from:

- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/workstation-native-manual-wall-input-browser-smoke.js`
- `node v6/tests/workstation-chart-adapter-browser-smoke.js`
- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`

Browser tests should be run sequentially because they share browser/debug-server
resources. If a browser smoke fails with `listen EPERM: 127.0.0.1`, rerun the
same command with approved escalation.

## Recent Commits

- `3417f9dc test(v6): verify replay k-line chart visibility`
- `8e3ebd86 feat(v6): gate replay k-line chart flow`
- `3be1804e test(v6): cover database k-line import boundary`
- `b74fd09e feat(v6): add database bars adapter boundary`
- `07899ef6 docs(v6): constrain history requests and replay latency`
- `91441296 docs(v6): capture leftward history extension requirement`

## Server Restart Note

Restarting the API/HTML service should not require code changes. After restart,
verify the service state with the normal local V6 page and continue from Step
146. The handoff point is intentionally after gating replay K-line chart flow
and before stabilizing reset view / KXG reset behavior.
