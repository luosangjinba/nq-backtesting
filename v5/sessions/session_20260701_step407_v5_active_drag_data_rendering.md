# Step 407 - V5 Active Drag Data Rendering

Date: 2026-07-01

Status: completed.

## Goal

Render newly loaded left-side K-lines while the user is still holding the mouse
button during native chart drag.

## Problem

Step 405 prevented runtime chart writes from interrupting Lightweight Charts
native drag. That fixed the major drag drift, but it also deferred all chart
syncs until mouseup. With Step 406 sparse backward seek working, newly loaded
left-side bars could still remain invisible until the user released the mouse.

## Decision

Split active native drag writeback into two categories:

- data replacement is allowed during active drag so newly loaded bars can render;
- only data replacement that expands loaded coverage uses that active path;
- runtime visible-range writeback remains blocked during active drag to avoid
  fighting Lightweight's native pan;
- the Lightweight adapter suppresses setData-generated visible-range echoes and
  compensates prepended bars by preserving the native logical viewport.

After native drag settles, chart runtime still flushes one full queued sync.

## Implementation

1. Added `allowDataDuringNativeInteraction` to chart host sync.
2. `updateBars()` now uses that option only when replacement expands loaded bar
   coverage.
3. Active-drag data sync calls adapter `setBars()` with `followViewport: false`
   and deliberately skips runtime `setVisibleRange()`.
4. Lightweight adapter preserves native viewport position when bars are
   prepended and suppresses setData range echoes.
5. Updated runtime and browser smokes to verify active drag permits `setData()`
   while preserving the manual anchor.

## Checks

- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/tests/replay-display-sparse-backward-seek-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next

Manually verify left-drag loading on the live page. If fast-drag pointer drift
is still visible, add a diagnostic that records pointer delta, Lightweight
logical-range delta, and V5 manual visible-range delta during the same drag.
