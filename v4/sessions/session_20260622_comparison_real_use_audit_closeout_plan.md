# Step 319: Comparison Real-use Audit Closeout

Date: 2026-06-22
Branch: feature/comparison-window-mvp
Status: completed

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

Status: completed.

Update `v4/docs/user/COMPARISON_WINDOW_REAL_USE_AUDIT.md` from `Not audited yet` to the observed pass/fail result for the workflows that were manually tested:

- same-instrument cross-timeframe PDA/Segment sync;
- `No Sync` hiding behavior;
- Main/Comparison object selection;
- comparison drawing creation auto-sync;
- same-instrument order/live overlay display.

Use concrete notes, not generic “passed” text, so later Split-removal decisions have evidence.

Result:

- Recorded the 2026-06-22 manual regression pass for same-instrument cross-timeframe drawing sync, `No Sync` hiding, object selection, Comparison creation auto-sync, and Order/Live overlay display.
- Kept untested workflows as `needs real-use data`.

## Step 319.2: Reconcile Audit Checklist With Current Semantics

Status: completed.

Update checklist wording that still assumes old same-timeframe-only sync:

- Drawings sync requires same instrument, not same timeframe.
- SMT remains time-alignment dependent and should be tested separately.
- Replay HTF progressive behavior remains separate from drawing sync.

Result:

- Checklist notes now separate same-instrument drawing sync from SMT time alignment and replay progressive candle behavior.

## Step 319.3: Identify Split Removal Blockers

Status: completed.

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

Result:

- No new code blocker was identified in the drawing sync regression.
- Split removal remains blocked by missing real-use evidence for SMT, HTF replay, Replay History restore, fixed layout preference, and advanced PDA frequency.

## Step 319.4: Run Closeout Regression Suite

Status: completed.

Run the focused Comparison Window suite after audit doc updates:

- `node v4/tests/comparison-window-browser-smoke.js`
- `node v4/tests/comparison-overlay-policy-smoke.js`
- `node v4/tests/comparison-render-policy-smoke.js`
- `node v4/tests/comparison-window-persistence-smoke.js`
- `node v4/tests/replay-history-comparison-smoke.js`
- `node v4/tests/smt-selection-smoke.js`
- `git diff --check`

Result:

- Passed.
- Node emitted the existing `MODULE_TYPELESS_PACKAGE_JSON` warning for ESM-style tests; this is pre-existing and not a Step 319 blocker.

## Step 319.5: Readiness Decision

Status: completed.

Write the final Step 319 decision into TODO/session:

- `ready for Split removal planning`;
- `needs focused fixes`;
- or `keep Split`.

If ready, the next step should be Step 320: Split removal plan.

Decision:

- `needs more real-use data`.

Next step:

- Do not open Split removal planning yet.
- Run one focused real-use audit session covering SMT, 1M + HTF replay, Replay History restore, fixed layout ergonomics, and advanced PDA frequency.
