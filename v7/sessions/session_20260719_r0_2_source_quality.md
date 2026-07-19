# V7 R0.2 Source Modularity And Documentation — 2026-07-19

## Trigger

The user required V7 to avoid oversized mixed-purpose files while retaining
detailed explanations that make ownership, invariants, and future deletion
work discoverable.

## Decision

File size is a typed budget and review signal. Single long-lived responsibility
is the primary invariant. Public contracts and critical rules explain why;
comment volume is never a quality metric.

## Scope

R0.2 adds H022/H023, a source-quality model validator, one positive model, and
seven intentional violations. It adds no production runtime.

## Manual Review

Review budgets, exception requirements, documentation fields, critical
invariant categories, and artificial-fragment handling. There is no browser
behavior in this step.

## Human Acceptance

Accepted by the user on 2026-07-19 before R0.3 began.
