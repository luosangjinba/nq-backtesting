# Step 505 - Pane Shell DOM And Resize Extraction

Date: 2026-07-04

## Trigger

After Steps 503 and 504, `chart-replay-route.js` no longer owns pane display
or layout sync orchestration. The next hotspot is `chart-replay-pane-shell.js`,
which still mixes:

- pane DOM creation/update;
- split handle DOM;
- split handle positioning;
- pointer drag state;
- active-pane selection and optimistic active-pane intent.

## Substep Plan

### 505.1 - Planning Handoff

Update TODO/session docs with the implementation split and commit before code
changes.

Verification:

- `git diff --check`

### 505.2 - Pane DOM Helpers

Create `chart-replay-pane-dom.js` and move:

- `paneTitle`;
- `splitHandleSpecs`;
- `createChartPane`;
- `createSplitHandle`;
- `updatePaneElement`.

Keep behavior unchanged. Pane shell should still call these helpers.

Verification:

- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `git diff --check`

### 505.3 - Split Resize Controller

Create `chart-replay-split-resize-controller.js` and move:

- split handle positioning;
- scheduled handle positioning;
- pointer capture/drag state;
- `layout.setSplitRatio` dispatch;
- resize cleanup/dispose.

Pane shell should keep controller lifecycle, active-pane selection,
render-state orchestration, and delegation to DOM/resize helpers.

Verification:

- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `git diff --check`

### 505.4 - Regression Gate And Closeout

Run Step 505 acceptance gates and update this handoff with the final result.

Verification:

- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `git diff --check`

## Guardrails

- Preserve active-pane optimistic selection behavior.
- Preserve split ratios and minimum wall behavior owned by layout runtime.
- Do not add new layout variants or behavior.
- Do not move chart runtime pane state; Step 506 owns that.
- Do not move replay pane display merge logic; Step 507 owns that.

## Status

Completed.

## Result

- Added `v5/src/features/chart-replay/chart-replay-pane-dom.js` for pure pane
  DOM helpers:
  - pane titles;
  - split handle specs;
  - dynamic pane creation;
  - split handle creation;
  - pane element metadata updates.
- Added
  `v5/src/features/chart-replay/chart-replay-split-resize-controller.js` for
  split resize behavior:
  - split track CSS variables;
  - split handle lifecycle and positioning;
  - pointer capture/drag state;
  - `layout.setSplitRatio` command dispatch;
  - window resize/animation-frame cleanup.
- Kept `chart-replay-pane-shell.js` focused on pane render-state
  orchestration, active-pane selection, and optimistic active-pane intent.
- Reduced `chart-replay-pane-shell.js` to 140 lines after the split.

## Commits

- `1686345 docs(v5): plan pane shell extraction`
- `80cee79 refactor(v5): extract pane DOM helpers`
- `93597fa refactor(v5): extract split resize controller`

## Verification

- `node --check v5/src/features/chart-replay/chart-replay-pane-dom.js`
- `node --check v5/src/features/chart-replay/chart-replay-pane-shell.js`
- `node --check v5/src/features/chart-replay/chart-replay-split-resize-controller.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `git diff --check`
