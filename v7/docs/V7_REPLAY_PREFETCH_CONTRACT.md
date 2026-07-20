# V7 Replay Prefetch Contract

Status: R3.3c binding pure advice contract (2026-07-20)

## Ownership

`core.replay-prefetch-contract` belongs to the Replay boundary but performs no
I/O. It receives the accepted cursor, Session range, explicit contiguous raw
coverage end, and a low/high-watermark policy. It returns either one immutable
window or no advice.

## Watermark Semantics

Coverage at or above low watermark produces no request advice. Coverage below
low recommends filling from its exact contiguous end toward high watermark.
The recommendation is clamped at Session end and never creates future Replay
visibility. A completed Replay has no forward advice.

The advice contains no provider, instrument, source resolution, or dataset
revision. The future Workspace coordinator supplies that identity and submits
the resulting bounded plan through Bar Data Runtime, which remains the sole raw
request/cache owner. Provider Execution continues complete plans automatically.

## Explicit Exclusions

No timer, polling loop, provider mapping, network/database access, raw cache,
cursor mutation, projection, chart, pane, viewport, persistence, pointer-event
continuation, legacy runtime import, or UI is introduced.
