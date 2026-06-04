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

## 2026-06-04 - Step 258.1 Secondary Chart Performance Baseline

User-observed friction:

- Split Screen secondary chart feels choppy while moving / hovering candles.
- The issue is most visible in real review mode where Split is on and large
  1M ranges or replay-related secondary updates may be active.

Static baseline from current code:

- Secondary chart mouse movement enters `secondary-chart-manager.js`
  `notifySecondaryCrosshairMove()`.
- That path updates the secondary OHLC legend on every crosshair event.
- It then calls `secondary-chart-controller.js` `syncPrimaryHoverCursor()`.
- `syncPrimaryHoverCursor()` currently resolves the secondary hover timestamp
  via `findDisplayBarByTime(secondaryStore.getSecondaryDisplayBars(), ...)`,
  then resolves the primary target bar with another `findDisplayBarByTime(...)`.
- Both lookups are linear scans and run at mousemove frequency.
- The same cost pattern exists in the primary-to-secondary direction through
  `syncSecondaryHoverCursor()`.
- Each resolved sync cursor update also calls a VerticalLine primitive update,
  causing chart redraw work on the opposite chart.

Optimization hypothesis:

1. Replace high-frequency linear scans with display-bar lookup caches.
2. Throttle cross-chart sync to one requestAnimationFrame callback per chart
   direction.
3. Avoid repeated legend `innerHTML` writes when the hovered OHLC did not change.
4. Verify pick preview / replay cursor precedence after throttling.

Manual DevTools performance profiling should be repeated after the code changes
using a large Split Screen range, with Sub 1M and Replay On/Off both covered.

## 2026-06-04 - Step 258 Secondary Chart Performance Completed

Implemented:

- Added `chart/display-bar-lookup.js` to cache high-frequency display-bar
  lookups by timeframe, bar count, first timestamp, and last timestamp.
- Replaced primary/secondary crosshair sync linear scans with cached lookups.
- Throttled primary-to-secondary and secondary-to-primary sync cursor work with
  `requestAnimationFrame`, keeping only the latest hover time per frame.
- Added legend update caching so unchanged OHLC hover data does not rewrite
  `innerHTML`.
- Preserved cursor priority: pick preview, replay cursor, and manual secondary
  hover cursor clear or block ordinary split sync cursor lines.

Verification:

- Targeted Step 258 smoke passed.
- Full `v4/src/**/*.js` `node --check` passed.
- `git diff --check` passed.

Manual follow-up:

- User should re-test the original slow scenario in browser, especially Split
  on, Sub 1M large range, Replay On/Off, and ES/NQ switch. DevTools profiling
  should show less time spent in hover bar lookup and fewer duplicate legend DOM
  writes.
