# V7 Layout Sync Symbol And Interval — R6.10b

Status: human accepted (2026-07-23)

## Product Behavior

The Layout menu now exposes the first three real consumers of the versioned
Session policy: Symbol, Interval, and Crosshair. Symbol retains its reviewed
default of on; Interval and Crosshair retain their defaults of off. Time and
Date range remain absent until their owners land.

Changing a switch changes only the policy used by a later command. It never
forces already different Panes to converge. After Symbol or Interval sync is
enabled, the next corresponding toolbar choice calculates the complete target
Pane Workspace first and commits it through exactly one Workspace Transaction.
Turning the switch off restores Pane-local behavior for later choices.

The Replay-control `Sync timeframe` switch remains separate: it maps the
active Pane TF to Replay step. Layout Sync Interval controls which Pane display
TF records a later TF choice replaces. Neither switch moves Replay by itself.

## Ownership And Atomicity

- `core.layout-sync-domain` remains the policy owner and Session Store remains
  its only durable writer.
- `core.pane-workspace-domain` owns pure instrument-policy and Pane-local/all-
  Pane timeframe transitions. The transitions retain every Viewport intent and
  the shared cursor.
- Replay Workspace UI reads the accepted policy once per user command and
  creates one desired complete Pane Workspace. It does not dispatch one event
  per Pane.
- Workspace Transaction Runtime remains the sole atomic materializer. All
  affected charts stage and publish together or the last accepted set remains.
- Replay and ETH/RTH remain mandatory Session-wide actions and are not Layout
  Sync switches.

## Clock Authority With No Primary Pane

Symbol sync may validly leave every visible Pane showing a comparison
instrument. That must not transfer shared-clock authority away from the
Session's primary instrument. Replay Navigation therefore asks its injected
source traversal port for the last eligible primary-source minute before the
target cutoff when no planned Pane shows that instrument. The Bar Data Runtime
remains the only requester/cache owner, and the resolved evidence is attached
only to the matching Replay proposal.

If accepted primary-source cache already proves the immediately preceding
minute, it is reused. Otherwise traversal searches backward in bounded windows.
The evidence can supply Replay `visibleThrough`; it does not create a hidden
Pane, chart, series write, or second Workspace transaction.

## Existing-Approach Audit

Official Lightweight Charts synchronization examples operate through chart-
instance crosshair and visible-range APIs. Those APIs are appropriate for the
later Time/Date-range presentation consumers, but Symbol and Interval change
the data identity of a Pane and therefore belong in the existing V7 complete-
Pane materialization path. The awesome-tradingview catalog supplied no owner
that preserves V7's sole-writer and atomic-commit rules.

## Gate

- Pane Workspace Domain tests bind local/all Symbol and Interval transitions,
  immutable Viewport retention, and strict negative controls.
- Replay Navigation and source-traversal tests bind primary-source evidence
  when every visible Pane is a comparison instrument, including the first
  Session cutoff cache edge.
- Replay Layout Workspace browser tests bind defaults, policy-only zero-
  transaction changes, later-command semantics, one visible complete-set
  commit, Pane-local restoration, Session re-entry, and the menu visual.
- Full architecture, module-host, source-quality, Harness, and diff gates must
  pass before the bounded commit.

The reviewed menu semantics and synchronized Symbol/Interval behavior were
accepted on 2026-07-23. R6.10c may therefore activate Time as a presentation-
only projection without changing the accepted Workspace transaction contract.
