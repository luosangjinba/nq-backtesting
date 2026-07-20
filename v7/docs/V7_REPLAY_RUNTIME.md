# V7 Replay Runtime

Status: R3.3b binding headless state owner (2026-07-20)

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

Manual and Auto advancement use this identical path. R3.3b creates no timer and
does not implement Auto cadence, which remains R7 behavior.

R5.4 adds `proposeRetention` for timeframe and Session Hours replacements. A
retention proposal cannot move the source cursor. Exact visible completion may
commit a `visibleThroughEpochMs` that precedes that cursor; the value must come
from Projection provenance and identify a real eligible source bar. Invalid,
failed, rejected, or stale retention proposals have zero cursor,
visible-through, or revision effects.

## Lifecycle And Exclusions

Disposal is idempotent and blocks later reads, proposals, and commits. This
runtime requests no bars, performs no projection, writes no chart or viewport,
persists no Session, imports no legacy runtime, and has no DOM/UI behavior.
