# V7 Replay Runtime

Status: R3.3b clock owner with R5.4, R6.4, R6.6, and R6.7 integration

## Ownership

`core.replay-runtime` is the only mutable owner of the accepted cursor,
visible-through source timestamp, and Replay revision. One instance is permanently bound
to one branded Session identity and activation generation. Panes, instruments,
display timeframes, providers, and charts cannot own another clock.

## Proposal And Visible Commit

`proposeAdvance` validates the complete workspace transaction identity and
returns an inert branded proposal. It changes no cursor or revision.

`commitVisible` is the sole publishing port. A future Workspace Transaction
Runtime may invoke it only after the corresponding chart snapshot is visible.
The runtime rejects proposals from another instance, Session, activation,
range, or accepted base revision. Rejected and superseded proposals have zero
cursor side effects.

Manual and Auto advancement use this identical path. R3.3b creates no timer;
continuous cadence remains a later transport behavior.

R5.4 adds `proposeRetention` for timeframe and Session Hours replacements. A
retention proposal cannot move the source cursor. Exact visible completion may
commit a `visibleThroughEpochMs` that precedes that cursor; the value must come
from Projection provenance and identify a real eligible source bar. Invalid,
failed, rejected, or stale retention proposals have zero cursor,
visible-through, or revision effects.

R6.4 adds `proposeTarget` for exact forward, backward, or retained navigation.
The proposal carries the covered span but remains inert. `play()` and `pause()`
now publish the Replay-owned playback state; they do not change the cursor
revision or bypass visible commit. A terminal cursor commit automatically
pauses at Session end. Navigation failure pauses through this public owner API.
Autoplay cadence/timers remain outside this runtime; R6.7 supplies them through
the UI transport boundary.

R6.6 adds the selected branded Replay step to the same Session-level owner.
The step is an aligned duration grid independent from every Pane display TF.
`setReplayStep()` validates and publishes selection without moving the cursor,
changing visible-through, or incrementing Replay revision. Manual Next,
Autoplay Next, and Manual Previous resolve targets from that exact selected
step; exact and quick GoTo remain independent from it.

R6.7 supplies that cadence through a UI-local scheduler which uses only this
runtime's public `play()`, `pause()`, and `snapshot()` ports. The scheduler owns
no playback state and cannot publish a cursor: every tick still resolves and
commits through Replay Navigation and the atomic Workspace transaction. Pause
invalidates scheduled continuation; an already in-flight proposal may settle
through the normal visible-commit rule but cannot schedule another tick.

## Lifecycle And Exclusions

Disposal is idempotent and blocks later reads, proposals, and commits. This
runtime requests no bars, performs no projection, writes no chart or viewport,
persists no Session, imports no legacy runtime, and has no DOM/UI behavior.

R8.7 defines the future Prepared Commit lifecycle shared by Replay, Chart,
Workspace State, and publication. It does not change `commitVisible` or Replay
state in this step. Replay becomes a real prepared participant only when
Workspace Transaction Runtime coordinates the four owners in R8.9.
