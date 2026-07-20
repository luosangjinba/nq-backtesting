# V7 R3.2b1 Provider Policy Contract — 2026-07-20

## Trigger

R3.2a passed review. Real market-data source and coverage product planning are
not decided, so core code must not bind itself to V4, a network API, or DuckDB.

## Boundary Decision

Add a pure Provider Policy Contract before coverage algorithms or execution.
It declares revision freshness, provider request limits, a failure deadline,
bounded retry, stable failure kinds, and the two-method adapter port.

No provider is selected or invoked. No timer, cache, coverage, Session, Replay,
projection, chart, pane, calendar, or UI behavior is added.

## Automated Gate

Passed before commit:

- Provider Policy contract harness with 12 negative controls;
- architecture boundary, architecture hardening, and source-quality gates;
- complete V7 suite: 19/19 harnesses passed;
- `git diff --check` passed.

## Human Review

Not required: this step has no interaction or visual change.
