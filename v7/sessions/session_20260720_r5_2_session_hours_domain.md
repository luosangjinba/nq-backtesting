# V7 R5.2 Session Hours/Calendar Domain — 2026-07-20

## Outcome

Completed the pure Session Hours/calendar boundary. Real NQ/ES source probes
confirmed the exchange-wall-clock UTC-like encoding, ordinary maintenance and
weekend gaps, DST-invariant labels, and observed 2026 shortened sessions.

## Boundary

Added one dependency-free `core.session-hours-domain` with immutable calendar,
eligibility, Projection policy, visible-through, and source-backed traversal
contracts. It adds no UI, runtime mutation, provider I/O, chart operation,
persistence, multi-pane, or multi-instrument behavior.

## Evidence

- official CME trading-hours and mutable holiday-calendar policy reviewed;
- read-only V4 adapter and DuckDB NQ/ES timestamp/range probes;
- focused Session Hours Harness with 16 negative controls;
- full V7 Harness suite and architecture/source-quality gates;
- `git diff --check`.

This headless step changes no browser interaction or visuals, so automated
acceptance applies under the standing workflow. Exact next step is R5.3 pure
fixed-duration timeframe projection.
