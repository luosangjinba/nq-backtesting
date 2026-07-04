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
