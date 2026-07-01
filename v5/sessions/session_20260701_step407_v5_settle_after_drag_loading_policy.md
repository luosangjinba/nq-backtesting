# Step 407 - V5 Settle-After-Drag Loading Policy

Date: 2026-07-01

Status: completed.

## Goal

Lock the accepted behavior for left-drag history extension: newly loaded
left-side K-lines render after mouseup / native interaction settle, not while
the left mouse button is still held.

## Context

Step 406 fixed sparse backward display-window seeking so V5 can continue left
across futures closed-session gaps. An active-drag rendering experiment then
allowed `setData()` during native drag, but that path risked disturbing
Lightweight Charts' native drag math and replay manual anchors.

The accepted UX is to preserve native drag fidelity first. Loading may happen
internally while dragging, but chart engine writes stay queued until the native
interaction settles.

## Decision

- Native pointer drag remains an active interaction phase.
- Chart runtime may observe visible-range changes, store manual range state,
  and emit viewport demand during active drag.
- Chart runtime must not write replacement chart data or explicit visible
  ranges into the chart engine during active drag.
- The guard applies even if bar coverage expands while dragging.
- Queued chart sync flushes after pointer release / native interaction settle.

## Implementation

1. Reverted the active-drag data-rendering experiment.
2. Kept Step 405's writeback guard as the policy for Step 407.
3. Strengthened browser smoke coverage so active-drag `chart.replaceBars` with
   expanded coverage still does not call Lightweight `setData()` before
   mouseup.
4. Updated TODO, chart interaction contracts, and session handoff index.

## Checks

- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/tests/replay-display-sparse-backward-seek-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next

If fast-drag pointer drift remains, add a diagnostic smoke or browser harness
that records pointer pixel deltas, Lightweight logical-range deltas, and V5
manual visible-range deltas for the same drag. Do not reintroduce active-drag
`setData()` without a separate measured design step.
