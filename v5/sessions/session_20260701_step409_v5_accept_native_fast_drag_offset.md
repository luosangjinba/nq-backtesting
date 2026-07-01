# Step 409 - V5 Accept Native Fast-Drag Offset

Date: 2026-07-01

Status: completed.

## Goal

Close the fast-drag pointer/content offset investigation as an accepted native
chart-engine behavior for the current V5 scope.

## Context

After Step 407, V5 defers runtime chart writes during active native drag. Step
408 added a diagnostic harness for separating pointer samples, native
visible-range observation, and runtime write counts.

Manual comparison found similar very-fast-drag pointer/content offset in FX
Replay / TradingView-style chart surfaces. This makes a V5-specific correction
low value and potentially risky.

## Decision

- Minor fast-drag pointer/content offset is acceptable when comparable to
  TradingView/FxReplay behavior.
- V5 should not add production compensation for this offset in the current
  replay workstation pass.
- Step 408's diagnostic harness remains available for future regression checks.
- Reopen only if the offset becomes materially worse than comparable chart
  products or breaks replay navigation accuracy.
- Return next work to single-pane chart shell/UI infrastructure before layout
  split panes.

## Implementation

1. Updated `v5/TODO.md` with the Step 409 decision and next direction.
2. Updated chart interaction contracts with the accepted native fast-drag
   offset rule.
3. Updated session handoff index and added this handoff.

## Checks

- `git diff --check`

## Next

Plan the next bounded single-pane chart shell cleanup step. Keep layout split
panes deferred until single-pane controls, setup/settings route polish, and
active-pane semantics are stable enough to reuse.
