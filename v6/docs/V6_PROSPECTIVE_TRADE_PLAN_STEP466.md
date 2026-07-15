# V6 Prospective Trade Plan — Step 466

Status: complete (2026-07-15)

Step 466 adds an immutable prospective trade-plan revision with stable plan id,
revision 1, long/short direction, entry, stop, target, and invalidation. Price
geometry is validated by direction. The plan references one active trial and
matching observation/evidence.

IndexedDB v3 adds a dedicated revision store and unique `(tradePlanId,
revision)` index. Initial prospective truth is append-only; later review edits
must be separate revisions and cannot overwrite it. No execution, outcome, R,
Analytics, Replay, chart, drawing, or Journal ownership is introduced.

Focused domain, repository, runtime, migration, and architecture gates passed.
Step 467 may record a separate simulated outcome referencing this revision.
