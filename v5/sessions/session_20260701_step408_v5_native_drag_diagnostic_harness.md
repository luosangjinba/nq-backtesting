# Step 408 - V5 Native Drag Diagnostic Harness

Date: 2026-07-01

Status: completed.

## Goal

Add a repeatable diagnostic harness for slow/fast chart drag analysis without
changing chart runtime behavior.

## Context

After Step 407, active native drag intentionally defers chart data writes until
mouseup / interaction settle. If fast dragging still feels offset from the
mouse, the next useful step is to measure the pointer/range/writeback chain
before changing behavior again.

## Decision

- Step 408 is diagnostic-only.
- The harness records real CDP pointer samples for slow and fast drag paths.
- Because headless Chrome CDP movement did not reliably make Lightweight emit
  internal pan frames, the harness injects synthetic native visible-range frames
  through the same subscribed callback path while V5 native interaction is
  active.
- The diagnostic records `setData`, `setVisibleRange`, and
  `setVisibleLogicalRange` deltas to separate pointer movement, range
  observation, and runtime writeback effects.
- This does not replace manual visual reproduction for Lightweight's own
  internal drag physics.

## Implementation

1. Added `v5/tests/chart-native-drag-diagnostic-browser-smoke.js`.
2. Instrumented pointer samples, native visible-range samples, logical range
   samples, and runtime chart write counters.
3. Added slow and fast drag scenarios with assertions that movement is sampled
   and runtime `setData()` remains quiet during the diagnostic drag.
4. Added the diagnostic smoke to `v5/scripts/smoke_all.js`.
5. Updated TODO, chart interaction contracts, and session handoff index.

## Checks

- `node v5/tests/chart-native-drag-diagnostic-browser-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next

Use this harness as a baseline when investigating fast-drag drift. If manual
browser repro still shows content/pointer divergence, add a follow-up diagnostic
that captures real Lightweight logical range from a headed browser session or a
Playwright trace before changing production drag behavior.
