# V6 Generic Observation And Evidence Snapshot — Step 465

Status: complete (2026-07-15)

Step 465 adds separate immutable `observation` and `evidenceSnapshot` artifacts.
They are created atomically for an active trial and linked reciprocally.

Observation is deliberately generic: prospective perspective, text, and one
category. Evidence stores pane, symbol, timeframe, canonical time-price,
Replay session/cursor, and visible-through provenance. Evidence time cannot be
later than the captured no-future boundary.

IndexedDB v2 adds `validationObservations` and `validationEvidence` stores with
trial and reciprocal-reference indexes. The runtime reads only public Replay
and Pane commands, writes through the repository, and adds no chart overlay,
hidden-bar read, Semantic Drawing, trade plan, outcome, or Analytics behavior.

Focused domain, transactional repository, runtime, migration, architecture,
and existing validation regression gates passed. Step 466 may add a separate
prospective trade-plan owner referencing observation/evidence; it must not fold
the plan into either artifact.
