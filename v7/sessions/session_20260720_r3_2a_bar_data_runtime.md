# V7 R3.2a Bounded Bar Data Runtime — 2026-07-20

## Trigger

R3.1 passed human review. The next bounded step must prove cache/request
ownership without committing to a real data source or future coverage UI.

## Boundary Decision

Activate one independently constructed Bar Data Runtime over an injected fake
provider port. It owns exact-window LRU cache, identical-request coalescing,
global bounded concurrency, automatic queue continuation, and disposal.

No V4/network/DuckDB adapter, overlapping coverage policy, revision discovery,
gap semantics, retry/deadline, prefetch, Session, Replay, projection, chart,
viewport, or UI behavior is introduced.

Runtime integration exposed one R3.1 conformance omission: a normalized batch's
derived `requestKey` was not accepted on revalidation. The contract is now
idempotent and rejects forged keys with a new negative control.

## Automated Gate

Passed before commit:

- deterministic fake-provider cache/concurrency/lifecycle harness;
- updated Bar Data contract harness with 12 negative controls;
- Bar Data Runtime harness with 6 negative controls;
- architecture boundary, architecture hardening, and source-quality gates;
- complete V7 suite: 18/18 harnesses passed;
- `git diff --check` passed.

## Human Review

Accepted by the user on 2026-07-20. The user then established the standing rule
that only interaction or visual changes require manual acceptance; headless
changes require a completion explanation and automated evidence.
