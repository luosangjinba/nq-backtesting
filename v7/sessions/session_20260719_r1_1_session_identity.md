# V7 R1.1 Session Identity — 2026-07-19

## Trigger

R0.4 passed human review, opening the first pure-contract slice. The user also
requires every bounded step to be committed and then manually reviewed.

## Targeted V6 Audit

The review was limited to Session identity call sites and related race tests.
V6 stored Session identity as ordinary strings, normalized persistence keys via
`String(sessionId || '').trim()`, copied ids into multiple runtime states, and
passed them repeatedly through asynchronous commands. This made a missing,
coerced, stale, or wrong-Session value structurally valid; later race tests had
to compensate after contamination paths already existed.

R1.1 therefore rejects these V6 patterns:

- implicit active-Session identity;
- raw string acceptance at Session-scoped public boundaries;
- consumer-side coercion or trimming;
- implicit JSON serialization of the branded value;
- identity registries or mutable module-global state.

No V6 production implementation was copied.

## Decision And Boundary

`core.session-identity` is a pure, independently runnable core contract owned
by the Session Store boundary. It creates immutable branded identities, compares
validated identities, and crosses persistence/transport boundaries only through
an exact schema-versioned record.

This step deliberately does not generate ids, create/open Sessions, track an
active Session, persist data, introduce activation generation or transaction
identity, request bars, control Replay, mutate charts, or render UI.

## Automated Gate

Passed before commit:

- architecture boundary and architecture hardening harnesses;
- cache/latency and foundation interaction contract harnesses;
- independent Session identity harness with nine intentional failures;
- source-quality harness;
- `git diff --check`.

The focused harness contains positive round-trip/isolation evidence and
intentional failures for raw, coerced, lookalike, forged, malformed, and
unsupported wire identities.

## Manual Review

Confirm the API is small, pure, clearly documented, independently tested, and
does not contain hidden Session state or premature R1.2+ behavior. Automated
evidence cannot accept this step.

## Human Acceptance

Accepted by the user on 2026-07-19 after clarifying that distinct A/B identities
mean different Replay Sessions cannot be treated as the same state namespace.
