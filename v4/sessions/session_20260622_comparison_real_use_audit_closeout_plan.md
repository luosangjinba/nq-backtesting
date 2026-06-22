# Step 319: Comparison Real-use Audit Closeout

Date: 2026-06-22
Branch: feature/comparison-window-mvp
Status: planned

## Context

Comparison Window has passed the latest real-data regression for the current drawing sync model:

- `Drawings: Sync` supports same-instrument cross-timeframe display.
- `Drawings: No Sync` hides drawings from Comparison while keeping compatible drawings on Main.
- Comparison-created PDA/Segment objects auto-switch to `Sync` when needed.
- Main-created PDA/Segment/Order/Live overlays can display in Comparison when instrument matches.

Before starting any Split removal work, the project still needs a formal real-use audit closeout so the decision is traceable.

## Goal

Convert the manual pass result into a documented readiness decision and identify the exact next engineering step:

- proceed to Split removal planning;
- keep Split as fallback;
- or fix any remaining blocker before removal planning.

## Non-goals

- Do not remove Split in Step 319.
- Do not delete legacy secondary/split code paths.
- Do not redesign Comparison Window layout unless the audit identifies a blocker.

## Step 319.1: Record Real-use Audit Results

Status: pending.

Update `v4/docs/user/COMPARISON_WINDOW_REAL_USE_AUDIT.md` from `Not audited yet` to the observed pass/fail result for the workflows that were manually tested:

- same-instrument cross-timeframe PDA/Segment sync;
- `No Sync` hiding behavior;
- Main/Comparison object selection;
- comparison drawing creation auto-sync;
- same-instrument order/live overlay display.

Use concrete notes, not generic “passed” text, so later Split-removal decisions have evidence.

## Step 319.2: Reconcile Audit Checklist With Current Semantics

Status: pending.

Update checklist wording that still assumes old same-timeframe-only sync:

- Drawings sync requires same instrument, not same timeframe.
- SMT remains time-alignment dependent and should be tested separately.
- Replay HTF progressive behavior remains separate from drawing sync.

## Step 319.3: Identify Split Removal Blockers

Status: pending.

Classify every audit row as one of:

- `pass`;
- `waived`;
- `needs fix before Split removal`;
- `keep Split fallback`.

Expected blocker candidates to explicitly confirm:

- fixed Stack/Side layout preference;
- replay progressive HTF candles;
- SMT locate/selection;
- advanced PDA tools that still exist only in old Split/secondary workflows.

## Step 319.4: Run Closeout Regression Suite

Status: pending.

Run the focused Comparison Window suite after audit doc updates:

- `node v4/tests/comparison-window-browser-smoke.js`
- `node v4/tests/comparison-overlay-policy-smoke.js`
- `node v4/tests/comparison-render-policy-smoke.js`
- `node v4/tests/comparison-window-persistence-smoke.js`
- `node v4/tests/replay-history-comparison-smoke.js`
- `node v4/tests/smt-selection-smoke.js`
- `git diff --check`

## Step 319.5: Readiness Decision

Status: pending.

Write the final Step 319 decision into TODO/session:

- `ready for Split removal planning`;
- `needs focused fixes`;
- or `keep Split`.

If ready, the next step should be Step 320: Split removal plan.
