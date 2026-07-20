# V7 R3.3a Replay Contract — 2026-07-20

## Boundary Decision

Establish provider- and chart-independent Replay time values before activating
the mutable owner. Advancement is duration-based and identical for Manual and
Auto inputs. Cursor proposals are transaction-scoped, revision-based, bounded
by Session end, and remain unaccepted values.

## Automated Gate

- Replay Contract harness with 8 negative controls;
- manual/auto equivalence, bounded target, half-open reveal window, exclusive
  no-future cutoff, identity validation, and overflow rejection;
- source-quality and architecture gates;
- complete V7 harness suite and `git diff --check` before commit.

## Human Review

Not required: this step has no interaction or visual change.
