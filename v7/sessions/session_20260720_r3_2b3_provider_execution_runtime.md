# V7 R3.2b3 Provider Execution Runtime — 2026-07-20

## Trigger

R3.2b1/R3.2b2 established pure policy and coverage planning. The next boundary
must prove those rules execute deterministically without choosing a real source.

## Boundary Decision

Wrap one injected fake adapter with policy-bound revision caching, deadline,
retry, concurrency, batch/coverage validation, cancellation, and disposal.
Expose that wrapper through the provider port already consumed by Bar Data
Runtime. Submit full request plans to Bar Data Runtime for automatic continuation.

No real provider, V4/network/DuckDB access, overlapping-report arbitration,
Session, Replay, projection, chart, pane, viewport, calendar UI, or visible
behavior is introduced.

## Automated Gate

Passed before commit:

- Provider Execution Runtime harness with 7 negative controls;
- deterministic revision TTL, retry, deadline, concurrency, coverage identity,
  caller/root abort propagation, and automatic plan acquisition;
- existing Bar Data Runtime integration harness;
- architecture boundary, architecture hardening, and source-quality gates;
- complete V7 suite: 21/21 harnesses passed;
- `git diff --check` passed.

## Human Review

Not required: this step has no interaction or visual change.
