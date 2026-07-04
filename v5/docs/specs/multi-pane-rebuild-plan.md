# Multi-Pane Rebuild Plan

Phase: Phase 3 - Real Chart Interaction.

Step: 511.

Purpose: stop incremental multi-pane patching and define the rebuild plan for a
stable FXReplay-like split-pane chart workstation.

## Reference-First Finding

Step 511 rechecked the TradingView ecosystem before planning more custom
multi-pane code.

`tradingview/awesome-tradingview` is a curated index, not a ready-made
multi-pane layout/runtime package. The useful direction is:

- keep Lightweight Charts as the chart-rendering engine;
- keep chart engine usage behind V5 chart runtime/adapter boundaries;
- build V5's own pane model, lifecycle, replay projection, and sync
  orchestration;
- do not expect a third-party layout plugin to solve replay cursor ownership,
  no-future semantics, active-pane TF behavior, or pane-local viewport demand.

## Current Failure Modes

Manual testing after Step 510 shows the current multi-pane path is still not
stable enough for more feature work:

- triple-pane layouts can open with one pane not rendering candles;
- reset view does not reliably recover the missing pane;
- initial active pane rules are incomplete for triple variants;
- the requested rule is now explicit: when expanding from single pane, the
  initial active pane must be the right-side or upper-side pane for the chosen
  layout;
- replay `Next` / playback can still feel delayed compared with V4,
  FXReplay, and TradingView;
- same-timeframe panes should advance together by default, but the current
  route/orchestrator path still behaves like primary advances first and other
  panes catch up.

These failures are structural. They cross layout state, pane DOM, chart host
mounting, replay display loading, viewport follow, and shared replay controls.

## Decision

Do not continue adding small fixes to the current multi-pane orchestration path.

The next multi-pane work must rebuild the coordination model around explicit
pane lifecycle phases and batch replay projection. Small fixes are allowed only
when they are required to keep existing tests passing while moving code into
the new model.

## Non-Goals For Step 511

Step 511 does not change production behavior. It is a planning and constraint
step.

Out of scope:

- rewriting chart runtime;
- changing Lightweight Charts adapter APIs;
- changing visible UI;
- adding new user-facing layout modes;
- implementing the final replay batch engine.

## Required Follow-Up

The rebuild must start by adding tests that currently expose the failing
contract. Production rewrites should then proceed behind those tests.

## Target Architecture

The rebuilt multi-pane path should use four explicit layers.

Core design principle: every visible pane should be an instance of the same
chart/replay display unit. Single pane, primary pane, secondary pane, and
tertiary pane must share the same lifecycle and rendering logic first. Multi-
pane behavior should then add layout placement, active-pane focus, sync policy,
and input routing on top of that shared unit. Do not split primary and
non-primary behavior into separate logic paths unless there is an explicit
runtime ownership reason and test coverage for the divergence.

### 1. Pane Layout Model

Owner: layout runtime.

Responsibilities:

- normalize mode, variant, pane list, split ratios, sync flags, and active pane;
- decide initial active pane from a variant policy table;
- preserve per-pane display timeframe, time, date range, and crosshair
  metadata;
- emit layout changes as complete layout snapshots.

Forbidden:

- loading bars;
- writing chart series;
- deciding replay projection;
- reading DOM.

Initial active pane policy:

- `single.default`: `primary`;
- `twice.vertical`: right-side pane, currently `secondary`;
- `twice.horizontal`: upper pane, currently `primary`;
- `triple.vertical`: right-side pane, currently `tertiary`;
- `triple.horizontal`: upper pane, currently `primary`;
- `triple.left`: right-side top pane, currently `secondary`;
- `triple.right`: right-side large pane, currently `primary`;
- `triple.top`: upper large pane, currently `primary`;
- `triple.bottom`: upper left pane, currently `secondary`.

If a future variant's visual ordering changes, the policy table must be updated
with that change. Do not infer initial active pane from array order alone.

### 2. Pane Shell And Host Registry

Owner: chart replay pane shell plus chart runtime host mounting.

Responsibilities:

- render pane DOM from a complete layout snapshot;
- mount, resize, and release chart hosts by pane id through chart commands;
- expose pane selection intent without mutating chart data;
- keep split resize ratio-based and enforce minimum walls.

Forbidden:

- calling Lightweight Charts APIs directly from route or pane shell;
- loading bars;
- deciding replay cursor state;
- deriving pane display windows.

### 3. Pane Display Coordinator

Owner: a new route-level coordinator module that replaces the current ad hoc
pane-orchestrator follow path.

Responsibilities:

- convert layout snapshots into pane display lifecycle work;
- create a deterministic initialization transaction for every mounted pane;
- ensure each pane has display timeframe, display context, visible bars,
  viewport follow, and reset state before it is considered ready;
- expose readiness to shared controls and browser tests;
- route active-pane TF changes and sync interval fan-out through explicit pane
  lifecycle work.

Allowed dependencies:

- command bus;
- layout commands;
- replay display-window commands;
- chart host/viewport commands;
- route session getters.

Forbidden:

- direct chart engine calls;
- direct bar-data calls;
- owning replay cursor or reveal state;
- silently falling back to primary pane data when a non-primary pane is not
  ready.

### 4. Replay Pane Projection

Owner: replay runtime and chart runtime through commands.

Responsibilities:

- advance the shared replay cursor once for a `Next` / `Play` tick;
- build one projection plan for all panes from that cursor;
- same-timeframe panes receive appended revealed bars and pane-local viewport
  follow in the same logical tick;
- independent-timeframe panes load/project their display window for the new
  cursor;
- chart runtime applies pane-targeted updates without route/UI series writes.

Forbidden:

- primary-first visual updates that leave other panes to catch up later as a
  separate UI effect;
- per-pane replay cursor ownership;
- route-owned chart writes;
- per-pane bar-data requests outside replay/bar-data runtime commands.

## Replacement Rule

`chart-replay-pane-orchestrator.js` may remain temporarily as an adapter while
the rebuild lands, but it should not accumulate new behavior. New logic should
move toward:

- layout runtime active-pane policy helpers;
- pane shell host lifecycle helpers;
- a pane display coordinator;
- replay pane projection helpers.

Any new multi-pane bug fix must either add a failing regression gate first or
be part of the rebuild sequence described below.

## Execution Sequence

### Step 512 - Failing Contract Smokes

Goal: capture the current broken user paths before production rewrites.

Add browser coverage for:

- every `twice.*` and `triple.*` variant opens with the expected initial active
  pane;
- every mounted pane has visible rendered bars after initial layout expansion;
- reset view recovers every visible pane;
- immediate `Next` after layout expansion advances every same-timeframe pane;
- no pane reports `fullBarCount > 0` with `renderedBarCount === 0` after
  initialization or replay next.

No production behavior changes should be included in Step 512 unless required
to make the test harness itself deterministic.

Step 512 may commit a strict smoke that fails against the current production
implementation. That is intentional: it is the executable contract for Steps
513-516. The step is complete when the smoke exists, documents the failing
contract, and `git diff --check` passes. Later rebuild implementation steps
must make the smoke pass before the rebuild is considered complete.

### Step 513 - Layout Active-Pane Policy Table

Goal: move initial active-pane choice into explicit layout-runtime helpers.

Implementation expectations:

- add a tested variant-to-active-pane policy helper;
- apply the helper only when expanding from single pane or when the previous
  active pane no longer exists;
- update docs if a variant's visual geometry changes.

Step 513 must stay inside layout runtime ownership. It should not mount panes,
load display windows, write chart series, change replay cursor semantics, or
special-case DOM order in the route. The browser smoke from Step 512 is the
end-to-end guard, but the production fix belongs in the layout active-pane
policy table.

### Step 514 - Pane Lifecycle Coordinator

Goal: replace opportunistic pane initialization with deterministic pane
readiness.

Implementation expectations:

- add a pane display coordinator module and move non-primary display
  initialization state out of `chart-replay-pane-orchestrator.js`;
- model pane display lifecycle states as `display-idle`, `display-loading`,
  `display-ready`, and `display-error`;
- initialize every non-primary pane from the same layout snapshot contract used
  by single-pane display logic, with explicit pane id and display timeframe;
- dedupe concurrent initialization by pane id plus display timeframe so repeated
  layout renders cannot enqueue duplicate display loads;
- expose readiness/error state for browser smokes and future shared controls;
- keep route UI out of bars, chart writes, bar-data requests, and replay cursor
  ownership.

Step 514 is an extraction and lifecycle-boundary step. It may dispatch layout
and replay display-timeframe commands, but it must not implement the final
multi-pane replay projection. Same-timeframe replay `Next` fan-out and
independent-timeframe projection belong to Step 515.

Coordinator boundary:

- allowed inputs: layout snapshot, pane records, route session getters, command
  bus, and status callback;
- allowed commands: `layout.setPaneDisplayTimeframe` and
  `replay.setDisplayTimeframe` for pane-scoped display setup;
- forbidden actions: direct Lightweight Charts calls, direct chart series
  writes, direct bar-data cache reads/writes, replay cursor mutation, and
  silent fallback to primary-pane data when pane display setup fails.

Acceptance:

- a pure coordinator smoke covers skip, dedupe, success, and error lifecycle
  transitions;
- the Step 512 rebuild contract smoke still passes after the orchestrator uses
  the coordinator;
- active-pane TF changes can mark the target pane display ready without touching
  unrelated panes when interval sync is off.

### Step 515 - Replay Pane Projection

Goal: stop primary-first replay catch-up behavior.

Implementation expectations:

- replay cursor advances once per `Next` / playback tick;
- build one pane projection plan from each advanced `replay:next` event and the
  current layout snapshot;
- same-timeframe panes append revealed bars with pane-local viewport follow in
  the same projection pass;
- independent-timeframe panes load/project windows for the same cursor
  timestamp;
- chart runtime receives pane-targeted commands only;
- rapid `Next` coalescing remains intact.

Projection boundary:

- allowed inputs: replay event payload, layout snapshot, pane display
  coordinator, route session getters, and command bus;
- same-timeframe command path: `chart.getViewportMetrics` followed by
  `chart.appendBars` for the target pane;
- independent-timeframe command path: `replay.loadDisplayWindow` for the target
  pane;
- forbidden actions: route-owned series writes, route-owned bar-data requests,
  replay cursor mutation, primary-pane fallback for panes with explicit display
  timeframes, and queued per-pane visual catch-up after the logical replay tick
  has completed.

Acceptance:

- a pure projection smoke covers same-timeframe append, independent-timeframe
  display-window load, primary-pane skip, no-advanced-event skip, and per-pane
  display initialization before projection;
- the Step 512 rebuild contract smoke still passes;
- rapid `Next` coalescing smoke still passes, proving Step 515 does not
  reintroduce a slow visible queue.

### Step 516 - Multi-Pane Performance Gate

Goal: make replay movement feel immediate enough to compare favorably with V4
and approach FXReplay/TradingView expectations.

Non-negotiable UX target: replay manual stepping must render the user's latest
intended cursor with effectively zero perceptible queue delay. If a user clicks
`Next` faster than the app can process individual DOM events, V5 should
coalesce to the newest intended reveal count and render that final chart state
as soon as possible. Human mouse repeat rate is roughly capped around 10 clicks
per second, so the product target is about 100ms from the latest `Next` intent
to the expected candle being visible. It must not visually drain a backlog one
candle at a time. The Step 516 smoke is only the first regression gate for this
contract; it is not the final performance standard.

Implementation expectations:

- add browser/performance smokes proving rapid `Next` input does not drain
  through a slow visible queue;
- measure time from click batch to final rendered cursor in a multi-pane
  same-timeframe layout;
- assert both primary and non-primary same-timeframe panes advance by the click
  batch size;
- assert same-timeframe non-primary panes use append projection instead of
  display-window reload during rapid `Next`;
- assert no forward bar fetch is needed after initial preload/cache setup;
- keep the gate deterministic enough for local CI-style runs.

Acceptance:

- the new smoke creates a real session, opens a multi-pane layout, waits for all
  panes to render, clicks `Next` rapidly, and waits for the final replay cursor
  instead of sleeping for a fixed delay;
- the final cursor, reveal count, and every same-timeframe pane rendered count
  reflect the click batch;
- command instrumentation confirms `chart.appendBars` is used for non-primary
  same-timeframe projection and `replay.loadDisplayWindow` is not used for that
  projection path;
- the elapsed threshold stays loose enough for local browser variance but tight
  enough to catch a visible half-second-per-bar queue.

Follow-up gates should increase input pressure beyond the initial 10-click
sample and should measure latest-intent latency directly. Browser automation
thresholds may allow headless/CI variance, but the product target remains
approximately 100ms. If V5 fails that standard while V4 and FXReplay feel
instant on the same machine, treat it as a V5 implementation bug, not an
acceptable tradeoff.

### Step 517 - Global Replay Latest-Intent Responsiveness

Goal: make the 100ms latest-intent replay target apply to every chart mode, not
only multi-pane.

Non-negotiable scope: the standard applies first to single pane, then to every
multi-pane layout. Single pane is the baseline path. If single pane cannot
render the latest intended `Next` cursor at V4/FXReplay-like speed, the
multi-pane path cannot be considered healthy.

Implementation expectations:

- document latest-intent-to-visible-candle as a replay transport contract, not a
  split-pane feature contract;
- add a single-pane browser smoke that measures the time from the final rapid
  `Next` click to the expected cursor/candle being visible;
- keep the product target at about 100ms, while allowing browser automation a
  wider threshold only for CI/headless variance;
- assert the chart jumps to the latest intended reveal count and does not
  visually drain one candle at a time;
- keep the existing multi-pane performance gate as a second-layer guard, not
  the source of truth.

Acceptance:

- single-pane and multi-pane gates both pass;
- the single-pane gate reports final-click-to-visible latency, not just total
  batch elapsed time;
- docs and handoff state clearly that V4 already achieves the expected user
  feel, so V5 missing it is a V5 implementation defect.

## Required Verification For Rebuild Steps

For Steps 512-517, the default verification set is:

- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `node v5/tests/replay-fast-next-browser-smoke.js`
- `git diff --check`

When chart runtime, adapter resize, reset view, or physical interaction code is
touched, also run:

- `node v5/tests/chart-interaction-browser-smoke.js`
- `node v5/tests/chart-price-scale-browser-smoke.js`

When new Step 512/516 smokes exist, they become required for every later
multi-pane rebuild step.
