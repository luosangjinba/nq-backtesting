# V7 Replay Contract

Status: R3.3a binding headless value contract (2026-07-20)

## Ownership

`core.replay-contract` belongs to Replay Runtime. It defines values only; it
does not own a mutable clock, schedule Auto Replay, request bars, project data,
write charts, persist a Session, or touch the DOM.

## Time Semantics

The activated Session has one bounded millisecond range. Its cursor is an
exclusive visibility cutoff: a source bar starting at `t` may be visible only
when `t < cursorEpochMs`. Raw future bars may remain cached.

Manual and Auto advancement use the same positive duration input. The duration
advances Replay time rather than selecting one candle at a display interval.
Projection must therefore retain every eligible intermediate source bar.

R5.4 adds a cursor-retention proposal for visibility-only workspace
replacements. It carries the same complete identity, cursor, range, and base
revision, but has an empty reveal window and a target equal to the current
cursor. It cannot masquerade as Manual or Auto advancement.

## Transaction Proposal

A proposal contains the complete branded workspace transaction identity, base
Replay revision, accepted cursor, bounded target, and half-open reveal window.
It cannot exceed Session end or safe-integer time. A proposal is not accepted
progress; R3.3b may publish it only after the corresponding workspace result is
visibly committed.

## Explicit Exclusions

R3.3a introduces no mutable runtime, timer, playback cadence, Previous/Restart/
Go-to, market calendar, provider, bar cache, projection, chart, pane, viewport,
persistence, network, V4/V5/V6 runtime import, or UI behavior.
