# Step 506 - Chart Runtime Pane State Helpers

Date: 2026-07-04

## Trigger

Step 505 reduced pane shell ownership. The next audit hotspot is
`chart-runtime.js`, where pane-local display state branching is still inline
with command registration, host lifecycle, adapter writes, and event emission.

## Substep Plan

### 506.1 - Planning Handoff

Update TODO/session/spec docs with the bounded extraction plan and commit
before code changes.

Verification:

- `git diff --check`

### 506.2 - Pure Pane State Helper Module

Create `chart-runtime-pane-state.js` and move pure pane-state helpers:

- pane id normalization;
- chart state snapshot cloning;
- retained pane id set creation;
- pane-state projection with primary fallback;
- pane display-state patching.

The helper must receive `primaryState` and `paneDisplayStateByPaneId` as
arguments. It must not register commands, emit events, mount hosts, or write
chart adapters.

Verification:

- `node --check v5/src/runtime/chart-runtime.js`
- `node --check v5/src/runtime/chart-runtime-pane-state.js`
- `git diff --check`

### 506.3 - Runtime Wiring And Regression Gate

Wire `chart-runtime.js` to use the helper while keeping chart runtime as the
only chart writer and command owner.

Verification:

- `node v5/tests/chart-runtime-pane-local-viewport-smoke.js`
- `node v5/tests/chart-price-scale-browser-smoke.js`
- `node v5/tests/replay-fast-next-browser-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `git diff --check`

Result:

- `chart-runtime.js` now imports pane-state helpers and injects its primary
  chart state plus pane display-state map through thin runtime-local wrappers.
- Command registration, event emission, host lifecycle, host sync, and adapter
  writes remain in `chart-runtime.js`.
- Regression gate passed with the existing `MODULE_TYPELESS_PACKAGE_JSON`
  warning from Node test execution.

### 506.4 - Closeout

Record final module boundaries, line count movement, commits, and verification
results.

Verification:

- `git diff --check`

## Guardrails

- Do not move chart adapter writes out of `chart-runtime.js` or host sync.
- Do not change command payloads or event payloads.
- Do not change primary-vs-pane-local display behavior.
- Do not touch replay display-window merge logic; Step 507 owns that.

## Status

Completed.

## Result

- Added `v5/src/runtime/chart-runtime-pane-state.js`.
- Moved pure pane-state helpers out of `chart-runtime.js`:
  - `DEFAULT_CHART_PANE_ID`;
  - `normalizePaneId`;
  - `cloneChartStateSnapshot`;
  - `stateForPane`;
  - `updatePaneDisplayState`;
  - `retainedPaneIdSet`.
- Kept chart runtime as the owner of:
  - command registration;
  - event emission;
  - host lifecycle;
  - host sync;
  - adapter writes.
- `chart-runtime.js` uses thin local wrappers to pass its primary state and
  pane display-state map into the pure helper.

## Commits

- `f6f968a docs(v5): plan chart runtime pane state split`
- `593d5c8 refactor(v5): extract chart runtime pane state helpers`
- `d487261 docs(v5): record chart runtime pane state gate`

## Verification

- `node --check v5/src/runtime/chart-runtime.js`
- `node --check v5/src/runtime/chart-runtime-pane-state.js`
- `node v5/tests/chart-runtime-pane-local-viewport-smoke.js`
- `node v5/tests/chart-price-scale-browser-smoke.js`
- `node v5/tests/replay-fast-next-browser-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `git diff --check`
