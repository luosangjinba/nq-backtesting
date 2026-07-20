# V7 R3.2b2 Coverage Planning Contract — 2026-07-20

## Trigger

R3.2b1 made provider limits explicit without selecting a source. The next pure
boundary must distinguish real data, settled gaps, temporary failure, and
unknown coverage before any runtime attempts automatic history acquisition.

## Boundary Decision

Require complete ordered coverage tiling and provide a pure bounded planner.
Only unknown intervals are acquired by default; unavailable intervals require
an explicit retry cycle. Chunk size respects provider time and bar-count limits.

No real/fake provider invocation, timer, cache mutation, overlapping-report
arbitration, Session, Replay, chart, viewport, calendar UI, or visible behavior
is introduced.

## Automated Gate

Passed before commit:

- Coverage Planning contract harness with 10 negative controls;
- architecture boundary, architecture hardening, and source-quality gates;
- complete V7 suite: 20/20 harnesses passed;
- `git diff --check` passed.

## Human Review

Not required: this step has no interaction or visual change.
