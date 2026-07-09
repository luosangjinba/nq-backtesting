# V6 Step 235 - Replay Step Back Owner Readiness Audit

## Decision

Step 235 is an audit step, not an implementation step.

The reserved transport Previous replay bar control must remain disabled until
the replay-domain, chart-entry, chart-data, viewport, bar-data, and multi-pane
owner contract is implemented through explicit commands.

## Current State

- Shell reserves `data-v6-transport-step-back` with `disabled`.
- Replay runtime exposes load, get-state, next, reset, play, and pause only.
- Replay domain exposes forward/reset/playback state helpers only.
- Chart-entry manual next owns the current transport-facing forward replay
  chart action.
- Chart-data runtime owns pane-local records and exposes replace, append,
  prepend, get, clear, and summary only.
- Bar-data runtime owns loading/caching bar windows.
- Chart viewport runtime owns default/manual wall intent and projection.

This means backward replay has no accepted owner path yet, and that is correct
for the current foundation state.

## Implementation Choices

### Remove The Latest Visible Bar

Rejected for the first implementation.

A visible bar is not always equivalent to one replay cursor step. Multi-pane
sessions can have different pane-local display timeframes. Higher timeframe
bars can aggregate many source bars. Projection and no-future filtering can also
change the visible record independently of a single replay cursor movement.
Deleting the latest rendered bar from shell, chart adapter, or chart-data would
couple visual state to replay state and repeat the old mixed-owner failure
class.

### Replay From A Cursor Snapshot

Deferred.

Cursor snapshots may become useful after journal/backtesting state grows, but
they would introduce persistence and replay-state snapshot ownership before the
basic backward cursor contract exists.

### Replace Chart Data From The Previous Cursor

Selected as the future direction.

The next implementation line should first add a pure replay-domain previous
cursor command. After that, chart-entry can orchestrate pane-local replacement
from the new cursor using existing owner boundaries. Chart-data remains the only
owner of visible pane records, and chart adapters remain downstream renderers.

## Owner Contract

Replay domain:

- owns backward cursor calculation;
- clamps at cursor index `0`;
- can move from `ready`, `paused`, `playing`, or `ended` state to the previous
  replay cursor state without changing chart data directly.

Replay runtime:

- owns the eventual previous replay command;
- stops or preserves playback according to the accepted playback policy before
  mutating replay state;
- emits replay events after replay state changes.

Chart-entry:

- owns transport-facing chart replay actions;
- will eventually expose a manual previous chart action separate from manual
  next;
- dispatches replay previous, loads or derives the required pane-local visible
  bars, and calls chart-data through explicit commands;
- targets the same visible pane set model used by manual next.

Chart-data:

- owns pane-local visible records;
- must not be mutated by shell or chart adapter code;
- should replace the pane record for a previous cursor rather than remove an
  arbitrary latest rendered bar;
- must preserve no-future guarantees by keeping only bars visible at or before
  the accepted replay cursor for that pane/timeframe.

Bar-data:

- remains the only runtime that requests and caches bar windows;
- should serve any missing bars needed for previous-cursor replacement through
  bounded window requests;
- should not know about transport button state.

Chart viewport:

- owns default/manual wall intent;
- must preserve current viewport intent when the replay cursor moves backward;
- may receive a cursor/revision projection event, but should not compute replay
  cursor state.

Multi-pane:

- Step Back should target visible panes through chart-entry orchestration;
- pane-local symbol/timeframe/display timeframe settings remain pane-owned;
- no pane should directly control another pane.

Shell transport:

- owns DOM events and visual disabled/enabled state only;
- must not directly call replay runtime, bar-data runtime, chart-data runtime,
  chart viewport runtime, or chart adapter methods for Step Back.

## Next Step

Step 236 should implement **Replay Previous Domain Command** only:

- add a pure replay-domain previous-state helper;
- expose `REPLAY_COMMANDS.PREVIOUS` in replay runtime;
- clamp previous movement at cursor index `0`;
- keep the transport Previous button disabled;
- do not wire chart-entry, chart-data, viewport, bar-data, shell transport, or
  multi-pane behavior yet.

That keeps the first implementation slice small and proves replay ownership
before chart mutation is introduced.

## Non-Goals

- Do not implement previous replay behavior in Step 235.
- Do not enable the Previous button in Step 235.
- Do not add a chart-entry manual previous command in Step 235.
- Do not add chart-data rollback/remove behavior in Step 235.
- Do not change replay cursor movement, chart-data records, viewport intent,
  bar-data requests, chart adapter behavior, pane fan-out, or transport click
  behavior in Step 235.
- Do not add new TFs, indicators, Pine Script compatibility, SMC/ICT overlays,
  trading simulation, order tickets, prop firm rule engines, or journal
  workflows.

## Acceptance

- This audit names the owner boundary for backward replay.
- Static smoke coverage proves the Previous button remains disabled.
- Static smoke coverage proves previous replay runtime/domain/transport
  behavior is not exposed yet.
- The next bounded implementation step is replay-domain/runtime only.
