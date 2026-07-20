# V7 R1.2 Activation Generation — 2026-07-19

## Trigger

R1.1 passed human review, opening the activation-generation pure-contract
slice. Every bounded step remains independently committed and manually gated.

## Targeted V6 Audit

V6 did not have one Session-activation generation. Instead, pane intent reload,
leftward history, Auto Replay, and forward prewarm each owned unrelated mutable
numeric counters. Those counters could suppress stale work inside one runtime,
but none answered the system-level question: does this completion still belong
to the currently activated instance of this Session?

R1.2 rejects these V6 patterns:

- using pane/request/timer retry counters as Session activation identity;
- accepting raw numbers at activation-scoped public boundaries;
- allowing generation zero, fractions, negatives, unsafe integers, or wrap;
- maintaining an implicit module-global activation counter.

No V6 production implementation was copied.

## Decision And Boundary

`core.activation-generation` is a pure, independently runnable core contract
owned by the Session Store boundary. It creates immutable branded generations,
derives a strictly later generation without mutation, compares validated
values, and uses an exact schema-versioned transport form.

This step does not decide where generations are allocated or stored. It adds no
active Session, cancellation, persistence, transaction identity, stale-result
acceptance, Replay, bars, charts, composition root, or UI.

## Automated Gate

Passed before commit:

- activation-generation independent harness with eleven intentional failures;
- architecture boundary and architecture hardening harnesses;
- cache/latency and foundation interaction contract harnesses;
- Session identity and source-quality harnesses;
- `git diff --check`.

The focused harness contains positive successor/round-trip evidence and
intentional failures for raw, lookalike, forged, invalid-range, overflow, and
unsupported wire generations.

## Manual Review

Confirm this is one pure value contract, that the successor is strictly later,
and that no pane-local operation counter or hidden allocator state has entered
the module. Automated evidence cannot accept this step.

## Human Acceptance

Accepted by the user on 2026-07-19 after clarifying that a positive safe integer
prevents invalid ordinals, precision collisions, and wraparound ambiguity.
