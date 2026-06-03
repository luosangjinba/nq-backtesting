# 2026-06-03 - Real Review Trial Baseline

## Context

Phase 16 P1 code-quality cleanup is complete and merged into `main`.
The old Step 46 Segment Review Metrics sample validation is also closed: the
system has already been used beyond that checkpoint, Segment Review Metrics are
working well in practice, and later Order Setup / Calendar / Phase 16 validation
covered a larger real workflow.

Current baseline commit for the trial period:

- `770e8a4 docs(v4): close segment metrics sample validation`

Current branch:

- `main`

Runtime note:

- V4 API was restarted on port 8766 with `/home/leo/miniconda3/bin/python3 v4_api.py`.
- `/v4/health` returned `{"status": "ok", "version": "4.0"}` after restart.

## Decision

Do not start another speculative refactor immediately.

Use the current system for actual review work for a while, then let real
friction, missing research fields, and repeated workflow problems drive the next
development phase.

## Trial Logging Categories

Record issues as they happen, preferably with date, instrument, timeframe,
object type, reproduction steps, expected behavior, and actual behavior.

- Bug: incorrect behavior, state corruption, data loss risk, broken locate/open,
  rendering failure, import/export issue.
- Friction: workflow works but requires too many steps, repeated manual effort,
  hard-to-find action, poor default state, awkward navigation.
- Research Gap: the review needs a field/object/relationship the current model
  cannot represent cleanly.
- Noise: metrics or UI information appears but does not help, is misleading, or
  should be hidden until needed.

## Suggested Next Phase

After enough real sessions are accumulated, open a new Phase 17 branch and turn
the highest-frequency findings into a small prioritized plan.

Recommended first planning pass:

1. Group the trial notes by Bug / Friction / Research Gap / Noise.
2. Fix high-confidence bugs first.
3. Only add schema or Review JSON fields when at least several real examples
   require the same concept.
4. Keep persistence-manager unification and broad file splitting deferred unless
   the trial exposes a concrete maintenance or data-loss risk.

## Current Open Backlog

These remain optional backlog items, not immediate next steps:

- Viewport maximize / restore.
- More complete keyboard shortcut mapping.
- Persistence manager for localStorage reads/writes.
- Deeper `order-review-store.js` / `setup-set.js` boundary cleanup.
- Further large-file evaluation for `time-reaction-actions.js`,
  `segment-panel.js`, and `order-setup-chart-actions.js`.

