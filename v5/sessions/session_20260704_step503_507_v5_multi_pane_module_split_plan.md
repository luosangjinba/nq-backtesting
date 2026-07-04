# Step 503-507 - Multi-Pane Module Split Plan

Date: 2026-07-04

## Trigger

User reported that multi-pane behavior feels logically confused:

- changing active panes and shared TF controls can still expose ownership
  ambiguity;
- pane-local TF labels and data state have previously diverged;
- active-pane, layout, chart runtime, and replay display-window logic are
  spread across too many files;
- future multi-pane work should not continue piling new behavior into route or
  runtime files.

## Decision

Steps 503-507 are a refactor sequence, not a feature sequence. The goal is to
clean module boundaries before adding more multi-pane capability.

The owning spec/audit is:

- `v5/docs/specs/multi-pane-module-audit.md`

## Step Plan

### Step 503 - Pane Orchestrator

Extract `chart-replay-pane-orchestrator.js` from `chart-replay-route.js`.

Scope:

- pane host mount/release dispatch;
- pane-local display initialization;
- active-pane display timeframe derivation;
- active-pane TF changes and interval-sync fan-out.

The route should remain responsible for page construction, event subscriptions,
controller wiring, and teardown.

### Step 504 - Layout Sync Controller

Extract `chart-replay-layout-sync-controller.js`.

Scope:

- time sync;
- date-range sync;
- crosshair sync;
- visible-range and crosshair event sync policy.

The controller dispatches layout commands only. It must not write chart data,
load bars, or mutate replay cursor state.

### Step 505 - Pane DOM And Split Resize

Split `chart-replay-pane-shell.js` into DOM helpers and resize behavior.

Create:

- `chart-replay-pane-dom.js`;
- `chart-replay-split-resize-controller.js`.

The pane shell should keep lifecycle, render orchestration, active-pane
selection, and optimistic active-pane intent.

### Step 506 - Chart Runtime Pane State

Extract `chart-runtime-pane-state.js` from `chart-runtime.js`.

Scope:

- pane id normalization;
- pane state lookup and patching;
- retained pane id sets;
- pane snapshot cloning;
- primary versus pane-local sync target helpers where practical.

Chart runtime remains the only chart writer and keeps command/event ownership.

### Step 507 - Replay Pane Display Merge Helper

Extract non-primary pane display-window merge rules from
`replay-display-window-controller.js`.

Create either:

- `replay-pane-display-loader.js`; or
- `replay-pane-display-window-state.js`.

Scope:

- pane-aware duplicate demand keys;
- target pane rendered-bar snapshot retrieval through chart commands;
- base/merged bar normalization;
- merge eligibility and diagnostics.

Replay display-window controller remains the owner of replay display loading,
bar-data load dispatch, chart sync dispatch, and replay events.

## Verification For Each Step

Run:

- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-runtime-pane-local-viewport-smoke.js`
- `git diff --check`

For Step 506, also run:

- `node v5/tests/chart-price-scale-browser-smoke.js`
- `node v5/tests/replay-fast-next-browser-smoke.js`

## Constraints

- Do not add new multi-pane behavior during these refactor steps.
- Do not move bar requests into route UI.
- Do not let layout runtime write chart series or load bars.
- Do not let chart runtime decide replay cursor or reveal state.
- Do not add per-pane toolbar controls as a workaround for active-pane state.

## Next

Start with Step 503. It has the best risk/reward ratio because route-level pane
orchestration is currently the largest source of multi-pane ownership
confusion.
