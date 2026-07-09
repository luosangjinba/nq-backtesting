# V6 Step 234 - Chart Foundation Next Slice Selection

## Decision

Step 235 should implement **Replay Step Back Owner Readiness Audit**.

This is a bounded chart-foundation audit slice. It should define the owner
contract for the currently reserved Previous replay bar control before any
runtime starts moving the replay cursor backward.

## Why This Slice

V6 now has stable forward replay paths, replay period handling, multi-pane
fan-out, viewport preservation, and chart-boundary label clarity. The transport
still reserves a disabled Previous replay bar button:

`data-v6-transport-step-back`

That is a real replay-workstation affordance, but it is not a trivial mirror of
Next. Backward replay affects several owners:

- replay cursor and reveal state;
- chart-entry replay orchestration;
- chart-data append/remove/replacement semantics;
- viewport intent preservation for default and manual walls;
- multi-pane replay fan-out and pane-local chart data;
- no-future visibility guarantees.

Implementing it without an owner audit risks reintroducing the V5 class of
mixed replay/chart/viewport coupling. Step 235 should make the boundary
explicit first.

## Owner Boundaries

- Replay runtime owns cursor and reveal state.
- Chart-entry replay orchestration owns transport-facing replay chart actions.
- Chart-data runtime owns pane-local chart series records and any rollback or
  replacement operation.
- Chart viewport runtime owns default/manual wall intent and must preserve it
  when the cursor moves backward.
- Bar-data runtime owns requests and cache reads.
- Shell transport owns only DOM events, visual disabled/enabled state, and
  command dispatch.

## Step 235 Scope

Implement Replay Step Back Owner Readiness Audit:

- document whether Step Back should remove the latest visible bar, replace a
  pane's visible chart-data record, or replay from a previous cursor snapshot;
- define the replay-domain API shape needed for previous cursor movement;
- define the chart-entry command boundary that transport may dispatch;
- define how multi-pane step-back should target visible panes;
- define viewport preservation rules for default wall and manual wall;
- define the first smoke/browser tests needed before implementation;
- keep the transport Previous button disabled until the owner contract is
  accepted.

## Non-Goals

- Do not implement previous replay behavior in Step 235.
- Do not enable the Previous button in Step 235.
- Do not change replay cursor movement, chart-data records, viewport intent,
  bar-data requests, chart adapter behavior, or pane fan-out in Step 235.
- Do not add new TFs, indicators, Pine Script compatibility, SMC/ICT overlays,
  trading simulation, order tickets, prop firm rule engines, or journal
  workflows.

## Acceptance

- The audit names the owner boundary for backward replay.
- The audit lists the concrete implementation choices and chooses the next
  bounded implementation step or defers it with reason.
- Static smoke coverage guards that the reserved Previous button remains
  disabled until the owner contract is accepted.
- Product direction, boundary, and relevant transport/chart smokes pass.
