# Step 323: Legacy Secondary Metadata Compatibility Audit

## Context

Step 321 removed the user-facing Split workflow. Step 322 removed legacy secondary runtime modules. Remaining `secondary` references are now compatibility surface for old review data, old route ids, and tests that assert removed DOM stays absent.

## Goal

Audit whether legacy `secondary` ids still need to be preserved for Review JSON / Daily Time Review / PDA / locate contracts, and validate that old secondary metadata does not require the removed Split runtime.

## Non-goals

- Do not reintroduce Split or secondary chart runtime.
- Do not bulk-migrate stored Review JSON yet.
- Do not remove compatibility fields until old Review JSON compatibility is explicitly waived.

## Step 323.1: Compatibility Surface Audit

Status: completed.

Findings:

- Removed runtime surface:
  - no source/test references remain for deleted `secondary-chart-manager`, `secondary-chart-store`, `secondary-viewport-controller`, `secondary-context-menu`, `secondary-pda-renderer`, `secondary-segment-renderer`, or `secondary-chart:*` / `secondary-bars:*` events.
- Must keep for compatibility now:
  - `VIEWPORT_TARGETS.SECONDARY`: old route input should return `unsupported-target` or map to Comparison intentionally instead of crashing.
  - `PICK_CONTEXT_TARGETS.SECONDARY`: old external/test input can still normalize safely, though no default secondary runtime definition exists.
  - `locatePdaProjection().secondary`: result shape compatibility for existing Calendar/Inspector callers and tests.
  - `sourceChartId='secondary'` / `sourceChartLabel='Secondary'`: old Review JSON metadata can still display as `Sub`.
- User-facing mismatch found and fixed:
  - Time Reaction locate UI still displayed `Sub`; it now displays `Comparison`.
  - Daily Time Review store now normalizes legacy `locate.chart='secondary'` to `comparison-window`.
- Leave for optional later cleanup:
  - historical TODO/design docs that describe the removed Split implementation.
  - old metadata display helpers that show `Sub` for archived objects.

## Step 323.2: Legacy Data Regression

Status: completed.

Regression method:

- Added `legacy-secondary-compatibility-smoke` with legacy-style objects instead of loading old secondary runtime.
- Covered:
  - Daily Time Review legacy `locate.chart='secondary'` normalizes to `comparison-window`;
  - legacy PDA `sourceChartId='secondary'` still formats as a readable `Sub ES 1H` badge;
  - PDA locate still returns a skipped `secondary` result field;
  - legacy secondary viewport target returns `unsupported-target` and does not call active handlers;
  - legacy `#secondary-chart` pick event falls back to primary context without importing secondary runtime.

Validation:

- `node v4/tests/legacy-secondary-compatibility-smoke.js`
- `node v4/tests/daily-time-review-store-smoke.js`
- `node v4/tests/viewport-router-smoke.js`
- `node v4/tests/pick-context-router-smoke.js`
- `git diff --check`

## Decision

Do not remove legacy `secondary` metadata compatibility yet. It is low-cost and protects old Review JSON. Future Step 323.3 can remove or migrate these fields only after reviewing real exported Review JSON history.

## Real-Use Follow-Up

User confirmed real validation passed after Step 323.1/323.2. Decision remains: keep compatibility fields for now; do not run Step 323.3 unless old Review JSON compatibility is explicitly waived.
