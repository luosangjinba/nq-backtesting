# V7 Continuous Autoplay — R6.7

Status: implemented; awaiting human interaction review (2026-07-21)

## Correction

R6.6's `Auto ×1` invoked exactly one `autoplay-next` action. Replay entered
`playing`, but no cadence owner scheduled another action, so the visible result
was one bar and Pause had nothing to cancel. R6.7 adds the missing continuous
cadence without creating another Replay clock or Workspace coordinator.

## Ownership

`replay-workspace-ui/autoplay-scheduler.js` owns only UI transport cadence. It
uses Replay Runtime's public `play()`, `pause()`, and `snapshot()` ports and
invokes Workspace Execution's existing `autoplay-next` action. Replay Runtime
remains the only playback/cursor/revision owner; Replay Navigation remains the
only target resolver; Workspace Transaction remains the only all-Pane
materialization coordinator; Chart Snapshot Application remains the only chart
writer.

## Cadence And Stop Semantics

- Play publishes `playing` immediately and starts the first selected Replay
  bar immediately.
- A later step is scheduled only after the preceding action has committed its
  complete Pane set, then waits the initial V6-reference cadence of `500ms`.
- A completion-driven timeout is used instead of `setInterval`, preventing
  overlap and backlog when acquisition or Projection is slower than cadence.
- Pause cancels the scheduled successor immediately. If one atomic Workspace
  transaction is already in flight, it may settle, but its generation is stale
  and it cannot schedule another step.
- Session completion, a rejected/non-committed action, or failure stops cadence
  and publishes `paused`.
- A manual navigation action still pauses through Replay Navigation Runtime;
  the pending cadence observes that accepted state and terminates.

Every successful tick uses the selected Session-level Replay step and the
existing atomic all-Pane response path. Pane TF, instrument, focus, and ETH/RTH
cannot fork the clock.

## Visible Surface

The interim top-row action is renamed `Play`, and its Pause control remains
enabled while an autoplay transaction is in flight so the cadence can be
stopped immediately. This bounded bug correction does not claim final transport
layout or speed-control acceptance. The reviewed constrained floating
bottom-center transport is R6.8.

## Gate

- a deterministic scheduler Harness proves immediate first step,
  completion-driven continuation, no overlap/backlog, Pause before the next
  cadence, Pause during an in-flight transaction, Session-end stop, and invalid
  ports;
- the real mixed-Pane browser selects a `5m` Replay step with an ES/`4h` active
  Pane, observes at least three committed autoplay steps, pauses, then proves
  cursor, Replay revision, and Workspace revision remain unchanged for
  `1200ms`, longer than two cadence intervals;
- established single-Pane performance, history responsiveness, replacement,
  visual, architecture, and source-quality gates remain green: 100 Next samples
  measured p95 `53.0ms`, p99 `62.9ms`, and max `71.5ms`; `12h` RTH replacement
  measured about `864ms`; rapid history recorded no long task.

## Deferred

- playback speed selection;
- constrained floating transport and final button arrangement (R6.8);
- one-to-four Pane layout expansion and Symbol/Interval/Crosshair/Time/Date
  range sync;
- Economic Calendar, which remains an optional later business module.
