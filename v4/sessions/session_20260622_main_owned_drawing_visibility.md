# Step 318: Main-Owned Drawing Visibility Semantics

Date: 2026-06-22
Branch: feature/comparison-window-mvp
Status: completed

## Problem

Current `No Sync` behavior still treats drawings as source-window-local:

- a PDA/Segment created in Comparison stays visible in Comparison under `No Sync`;
- switching Sync -> No Sync returns it to Comparison-only visibility.

That does not match the intended model. Main is the canonical review chart. Drawings may be created from either chart, but under `No Sync` the Comparison chart should hide drawings while Main still shows them.

## Target Semantics

- `Sync`: Main and Comparison both show compatible drawings.
- `No Sync`: Main shows compatible drawings; Comparison hides drawings.
- Drawings created in Comparison are still workspace drawings and should not be trapped in Comparison-only visibility.
- If the user draws from Comparison while `No Sync` is active, automatically switch Drawings to `Sync` before creating the object.
- If Main/Comparison instrument or timeframe do not match, do not create Comparison drawings; show a status message instead.

## Steps

### Step 318.1: Policy Semantics Update

Status: completed.

Update render/hit policy so chart target, not creation source, defines visibility:

- Primary/Main target: allow compatible PDA/Segment objects regardless of source.
- Comparison target: allow compatible PDA/Segment objects only when Drawings is `Sync`.
- Mismatch still blocks cross-context projection.

Implementation notes:

- `canRenderObjectOnChartTarget(..., 'primary')` now checks only projection compatibility with Main, not Drawings sync mode.
- `canRenderObjectOnChartTarget(..., 'comparison-window')` requires `Sync` plus instrument/timeframe match.
- Existing mismatch comparison-source objects no longer hit in Comparison under the new Main-owned visibility semantics.
- Verification: `git diff --check`, `node v4/tests/comparison-overlay-policy-smoke.js`, `node v4/tests/comparison-window-browser-smoke.js`.

### Step 318.2: Comparison Creation Auto-Sync

Status: completed.

Before Comparison context-menu creates PDA/Segment:

- if Drawings is `No Sync`, switch it to `Sync`;
- if sync is impossible due to instrument/timeframe mismatch, block creation and surface a concise status message.

Implementation notes:

- Comparison context-menu drawing actions now call a preflight guard before creating PDA/Segment objects.
- Matching Main/Comparison with `No Sync` automatically switches Drawings to `Sync`.
- Instrument/timeframe mismatch blocks Comparison drawing creation and emits a status message.
- Browser smoke now asserts mismatch Comparison PDA/FVG/Segment creation returns no object.
- Verification: `git diff --check`, `node v4/tests/comparison-window-browser-smoke.js`.

### Step 318.3: Browser Verification

Status: completed.

Extend browser smoke:

- Set `No Sync`, create PDA/Segment from Comparison, assert mode becomes `Sync`.
- Assert object hits in Main and Comparison.
- Switch back to `No Sync`, assert object still hits in Main and no longer hits in Comparison.

Implementation notes:

- Browser smoke now uses the actual Comparison context menu to create a PDA and Segment while Drawings is `No Sync`.
- The test verifies the creation path auto-switches to `Sync`, then confirms both Main and Comparison hit the created objects.
- After switching back to `No Sync`, the same created objects remain hittable in Main and disappear from Comparison hit-test.
- Verification: `git diff --check`, `node v4/tests/comparison-window-browser-smoke.js`.

### Step 318.4: Closeout Verification

Status: completed.

Expected commands:

- `git diff --check`
- `node v4/tests/comparison-overlay-policy-smoke.js`
- `node v4/tests/comparison-window-persistence-smoke.js`
- `node v4/tests/comparison-window-browser-smoke.js`

Final result:

- Main is now the canonical drawing visibility target.
- `No Sync` hides drawings from Comparison instead of trapping them in their creation window.
- Comparison drawing creation under `No Sync` automatically switches Drawings to `Sync`.
- Comparison drawing creation is blocked when Main and Comparison instrument/timeframe do not match.
- Browser smoke covers the full path: create from Comparison under `No Sync`, auto-switch to `Sync`, hit in both charts, switch back to `No Sync`, remain hittable in Main and disappear from Comparison.

### Step 318.5: Renderer Policy Leak Fix

Status: completed.

Follow-up bug:

- PDA/Segment objects created in Comparison were no longer selectable after switching to `No Sync`, but still remained visually rendered in the Comparison chart.

Fix:

- Removed the Comparison renderer local-source bypass for PDA and Segment overlays.
- Both renderers now use the same chart-target policy as hit-test and selection.
- `No Sync` hides all drawings from Comparison; Main remains the canonical chart for compatible drawings.

### Step 318.6: Cross-Timeframe Drawing Sync

Status: completed.

Follow-up bug:

- Main 1H + Comparison 1M with Drawings `Sync` did not show Main-created BSL/PDA in Comparison.

Fix:

- Relaxed Drawings `Sync` from same instrument plus same timeframe to same instrument.
- PDA/Segment/Order/Live projection no longer rejects solely because source and target timeframes differ.
- Comparison drawing creation preflight now requires matching instrument only.
- Timeframe differences are handled by the target chart time mapping; objects with timestamps outside the visible target window naturally do not render.
