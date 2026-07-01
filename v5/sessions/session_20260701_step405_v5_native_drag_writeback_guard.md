# Step 405 - V5 Native Drag Writeback Guard

Date: 2026-07-01

Status: completed.

## Goal

Keep Lightweight Charts native drag visually attached to the mouse by preventing
V5 runtime chart writebacks while the pointer drag is active.

## Problem

Step 404 reduced viewport-demand churn, but manual validation showed a separate
drag fidelity issue: while holding the left mouse button and dragging, chart
content could move by a different distance than the pointer.

The likely cause was a runtime writeback loop during native drag:

- Lightweight Charts owns immediate pressed-mouse pan.
- V5 observes native visible-range changes and records manual range state.
- Replay/display-context work can still cause chart runtime to call
  `series.setData()` and `timeScale().setVisibleRange()`.
- If that writeback happens before pointer release, it can disturb
  Lightweight's native drag coordinate math.

## Decision

Native drag is an active interaction phase, not just a recent input timestamp.

While the native interaction is active:

- chart runtime may record visible range state;
- chart runtime may emit viewport demand;
- replay/bar-data runtime ownership remains unchanged;
- chart runtime must not write replacement data or visible ranges back into the
  chart engine.

If a runtime chart sync is requested during active native interaction, it is
queued and flushed once the interaction settles.

## Implementation

1. Added native interaction phase tracking in the Lightweight adapter.
   The adapter now reports active/settled phases for mouse drag, touch drag, and
   wheel interactions.

2. Added chart-runtime native interaction state.
   `chart.getInteractionState` now exposes `nativeInteraction` for diagnostics,
   and chart metadata mirrors the active/type values.

3. Guarded chart host synchronization.
   While native interaction is active, `syncChartHost` updates metadata only and
   queues one pending chart sync instead of calling `setData()` /
   `setVisibleRange()`.

4. Flushed deferred chart sync after settle.
   On pointer release or wheel settle, chart runtime applies the latest queued
   chart state once.

5. Extended smoke coverage.
   Runtime and browser smokes now prove a runtime sync requested during active
   drag does not call `setData()` until the interaction settles.

## Success Criteria

- Native pressed-mouse pan remains visually owned by Lightweight Charts while
  the pointer is down.
- Runtime-originated chart data and visible-range writes do not interrupt active
  native drag.
- Deferred runtime chart sync flushes after native drag settles.
- Manual replay viewport anchor, no-future display, and right-edge behavior
  remain intact.

## Checks

- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/tests/replay-display-viewport-demand-wiring-smoke.js`
- `node v5/tests/replay-viewport-follow-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next

Manually verify the live page drag behavior. If the pointer/content drift still
appears, the next investigation should instrument native logical range deltas
against pointer deltas during one drag gesture, rather than tuning replay demand
or transport controls.
