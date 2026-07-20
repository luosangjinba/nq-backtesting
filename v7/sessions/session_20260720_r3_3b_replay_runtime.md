# V7 R3.3b Replay Runtime — 2026-07-20

## Boundary Decision

Activate one mutable Replay clock per Session activation. Proposal creation is
pure with respect to accepted state; only an explicit visible-commit call may
publish cursor progress. Instance provenance plus activation and base revision
prevent foreign or stale acceptance.

## Automated Gate

- Replay Runtime harness with 7 negative controls;
- proposal-zero-side-effect, visible commit, rejection preservation, Manual/
  Auto common path, Session/activation isolation, stale/foreign rejection, and
  deterministic disposal;
- Workspace Transaction, Replay Contract, source-quality, and architecture gates;
- complete V7 harness suite and `git diff --check` before commit.

## Human Review

Not required: this step has no interaction or visual change.
