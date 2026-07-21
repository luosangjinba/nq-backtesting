# V7 Replay Navigation Runtime

Status: R6.4 owner with R6.6 bar-step and R6.7 cadence integration (2026-07-21)

## Decision

`core.replay-navigation-runtime` is a thin routing and target-resolution
boundary over the existing owners. It does not recreate V6's command/event
coordinator.

- Replay Runtime remains the only cursor, reveal, and playback-state owner;
- Workspace Transaction Runtime remains the only materialization coordinator;
- Bar Data Runtime remains the only raw requester/cache owner behind an
  injected source-traversal port;
- R6.2 remains the complete visible-Pane response planner;
- R6.3 remains the complete Pane-set acquisition/Projection/application path;
- Chart Snapshot Application remains the sole chart-writer boundary.

The navigation executor prepares one response plan and one immutable request
per Pane, then invokes at most one Workspace Transaction. It owns only a
transient one-in-flight guard; it owns no accepted product state.

## Replay Target Proposal

Replay Contract and Replay Runtime now support an inert exact-target proposal.
It may move forward, backward, or retain the accepted cursor and carries the
complete covered span. Proposal creation has no accepted-state effect. The
cursor and revision still publish only after the complete Pane set crosses the
exact visible-completion boundary.

Replay Runtime now exposes its real `playing`/`paused` state. Manual navigation
and failure pause through that owner. An Autoplay Next action enters `playing`,
uses the same target resolver and transaction as Manual Next, and stays playing
only after a non-terminal success. Reaching Session end or any failed terminal
result pauses. The navigation action remains exactly one step and owns no timer.
R6.7's UI-local scheduler invokes that public action repeatedly only after each
complete visible commit; no cadence concern enters this runtime.

## Target Resolution

The injected source-traversal port resolves:

- the next non-empty aligned primary-instrument Replay-step completion;
- the previous non-empty aligned primary-instrument Replay-step completion;
- the first eligible source bar inside each bounded quick-GoTo anchor window.

R6.6 makes Replay step an explicit Session-level branded grid rather than an
implicit source-minute step. Resolution skips empty closed-session/weekend
buckets, preserves completion alignment when source minutes are missing, and
does not follow the active Pane's display TF. Exact and quick GoTo are unchanged.

The navigation module never requests raw bars itself. Results must be exact,
immutable source/target cutoff pairs inside the active Replay range. The
transaction AbortSignal covers target lookup before acquisition, so superseded
resolution cannot issue a live proposal.

Exact GoTo and Restart/Back-to already carry their requested cutoff and bypass
source traversal. Exact GoTo at the current cursor returns a no-op without
creating Pane requests or a Workspace Transaction.

## Quick GoTo Schedule

The five quick actions are:

- Next Day Open;
- Next Session;
- Asian Session;
- London Session;
- New York Session.

Defaults are `18:00`, `19:00`, `02:00`, and `09:30` in
`America/New_York`. Candidate generation is pure, strictly forward, bounded to
32 candidates by default, and does not invent weekend or holiday rules. Source
traversal accepts a candidate only when a real eligible bar exists within the
bounded 15-minute window; otherwise the next candidate is tried.

Unlike legacy V6's UTC-like wall timestamp domain, V7 has already normalized V4
bars into real instants. R6.4 therefore converts New York wall anchors into real
DST-aware instants: `09:30` is `14:30Z` before the 2026 spring transition and
`13:30Z` after it. Nonexistent and repeated wall times are handled by matching
actual `America/New_York` fields, not by a fixed UTC offset.

Custom anchor values are accepted by the pure schedule constructor. R6.5 mounts
the five default quick actions, keyboard shortcuts, and exact New York calendar
control over this same path. Custom-anchor persistence and settings remain
later work and cannot create another Replay path.

## Complete Pane-set Semantics

Every non-no-op action uses the same stable Pane order and one shared proposal.
Forward GoTo request intent retains `complete-forward-range`; backward actions
retain replacement coverage. Mixed instruments and TFs project independently,
while the Session primary instrument supplies Replay `visibleThrough` truth.
An empty comparison Pane may commit with the complete set and cannot fork or
stall the shared clock.

Only one navigation execution may be in flight. A second Autoplay/manual/GoTo
action is rejected as `navigation-in-flight` and is never queued. Resolution,
acquisition, Projection, visible application, stale, or cancellation failure
preserves the last accepted Replay/workspace/chart state and pauses playback.

## Remaining Exclusions

- no timer or speed ownership inside Replay Navigation Runtime;
- no navigation-preference persistence;
- no Economic Calendar or marker provider.

## Gate

`tests/replay-navigation-runtime-harness.js` proves DST-aware schedules, all
five quick actions, the one-step Autoplay primitive, Manual Next/Previous,
Restart/Back-to,
exact forward/backward/no-op GoTo, continuous-range request intent, weekend
anchor skipping, mixed NQ/ES and `1m`/`4h`, comparison-Pane absence,
primary-instrument visibility, overlap suppression, failure pause/preservation,
and 21 negative/race controls.

`tests/replay-autoplay-scheduler-harness.js` separately proves R6.7 continuous
cadence, completion-driven scheduling without backlog, Pause before and during
an in-flight step, and terminal stop. This keeps cadence outside the navigation
owner while exercising only its public one-step action.

`tests/replay-step-source-traversal-harness.js` additionally proves `5m` and
`1h` completion, missing-minute stability, RTH weekend skipping, symmetric
Previous, and partial `12h` RTH completion without a synthesized source bar.
