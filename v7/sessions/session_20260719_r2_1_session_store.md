# V7 R2.1 Session Store And Persistence Boundary — 2026-07-19

## Trigger

R1.5 passed human review, opening the first stateful foundation boundary.

## Boundary Decision

`core.session-store` owns versioned Session records, Session metadata,
historical range, instrument selection, revision, and persisted activation
generation. The R2.1 workspace envelope is deliberately `uninitialized`; pane,
bar, Replay cursor, viewport, and chart state do not exist yet.

`adapter.session-persistence` adapts a supplied Web Storage-compatible surface
and implements explicit-key repository operations. Every operation requires a
branded SessionId. There is no active/current/last-opened Session persistence
key and no module-global repository or cache. Adapter replacement keeps the
Session Store contract unchanged.

Activation advances in the same compare-and-swap revision commit as the
Session record. Reconstructing both repository and Session Store over the same
storage therefore restores A/B independently and cannot reuse an older
activation generation.

This step adds no chart, bars, Replay cursor, pane state, viewport, provider,
network, DOM, UI, route, or application singleton.

## Automated Gate

Passed before commit. Focused evidence covers explicit A/B keys, independent
metadata/ranges, CAS rejection, A→B→A generation, runtime reconstruction,
deliberate record migration, corrupt/unsupported input, identity/key mismatch,
and absence of an implicit active Session key.

All thirteen V7 harnesses pass, including six intentional Session Store
negative controls plus repository duplicate/CAS rejection. Architecture,
module-host, identity, transaction, capability, interaction, latency, source
quality, and legacy-isolation gates remain green. `git diff --check` passes.

## Human Review

Confirm the headless boundary and evidence. R2.1 has no interaction or visual
surface. Automated evidence cannot accept the step. Passing R2.1 opens R2.2,
which will provide the professional Session browser and the primary interaction
and visual audit.
