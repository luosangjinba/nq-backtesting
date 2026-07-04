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
