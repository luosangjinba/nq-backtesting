# V7 R1.3 Transaction Identity And Pure Currency — 2026-07-19

## Trigger

R1.2 passed human review, opening the final identity tuple and pure transaction
contract slice.

## Targeted V6 Audit

V6 chart replacement allocated ids from module-global mutable state, then
Session Hours, visual bridges, performance correlation, pane schedulers, and
cancellation slots each carried only part of transaction truth. Abort success
was often treated as correctness even though late completions still required
scattered identity/revision/generation checks.

R1.3 rejects these patterns:

- module-global transaction-id allocation;
- transaction ids without explicit Session and activation generation;
- cancellation as the proof that a completion is safe to commit;
- ad hoc intent/result statuses owned by each feature runtime;
- stale decisions that permit any state, cache, event, persistence, or UI write.

No V6 production implementation was copied.

## Decision And Boundary

`core.transaction-identity` owns the opaque TransactionId value contract.
`core.workspace-transaction-contract` depends only on the three public identity
modules and owns the complete tuple, generic lifecycle envelopes, and pure
current/stale assessment.

Domain payload remains in future domain contracts; this lifecycle shell does
not become a generic data bag. The pure `settle` constructor validates terminal
records but does not claim runtime liveness or exactly-once execution. Those
rules remain deferred until a real Workspace Transaction Runtime exists.

This step adds no allocator, scheduler, cancellation owner, transaction runtime,
state writer, persistence, Replay, bars, charts, composition root, or UI.

## Automated Gate

Passed before commit:

- TransactionId harness with nine intentional failures;
- workspace transaction contract harness with eleven intentional failures;
- architecture boundary and hardening harnesses, including active required-port
  existence and acyclic dependency checks;
- SessionId, activation-generation, source-quality, cache/latency, and
  foundation-interaction harnesses;
- legacy/global allocator, timer, cancellation, and active-Session source scan;
- `git diff --check`.

Focused harnesses cover opaque id round-trip, complete tuple equality,
deterministic completion-order assessment, all terminal statuses,
raw/lookalike/forged identities, invalid lifecycle transitions, and stale
zero-side-effect declarations. The mixed public implementation was split before
commit into focused identity/currency and lifecycle files behind one facade.

## Manual Review

Confirm the tuple always contains all three branded components, stale always
declares no allowed side effects, cancellation is not part of currency logic,
and no runtime guarantee is claimed before its owner exists. Automated evidence
cannot accept this step.
