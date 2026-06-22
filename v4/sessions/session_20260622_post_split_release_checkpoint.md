# Step 324: Post-Split Release Checkpoint

## Context

Steps 321-323 removed user-facing Split, removed legacy secondary runtime internals, and validated legacy secondary metadata compatibility. User confirmed real validation passed.

## Goal

Create a light release checkpoint after Split removal and secondary cleanup. This step should record the stable state and run core smoke tests. It should not add product features or remove compatibility fields.

## Non-goals

- Do not remove `VIEWPORT_TARGETS.SECONDARY`, `locatePdaProjection().secondary`, or historical `sourceChartId='secondary'` compatibility.
- Do not change Review JSON schema.
- Do not start the Optimal Exit / Max Profit Exit feature in this checkpoint.

## Step 324.1: Record Readiness State

Status: completed.

Result:

- User confirmed post-Step-323 real validation passed.
- Legacy secondary runtime is gone.
- Legacy secondary metadata compatibility remains by design for old Review JSON safety.
- Step 323.3 remains deferred.

## Step 324.2: Core Smoke Suite

Status: completed.

Required suite:

- `node v4/tests/comparison-window-browser-smoke.js`
- `node v4/tests/replay-history-comparison-smoke.js`
- `node v4/tests/comparison-replay-sync-smoke.js`
- `node v4/tests/smt-selection-smoke.js`
- `node v4/tests/legacy-secondary-compatibility-smoke.js`
- `node v4/tests/live-record-browser-smoke.js`
- `node v4/tests/tradovate-zip-import-browser-smoke.js`
- `git diff --check`

Result:

- All required checks passed.
- Node emitted the existing `MODULE_TYPELESS_PACKAGE_JSON` warning for ESM-style test files; no test failures.

## Step 324.3: Closeout

Status: completed.

Record:

- smoke result;
- final branch/worktree state;
- recommended next feature/architecture direction.

Result:

- Post-Split release checkpoint passed.
- Compatibility decision: keep legacy secondary metadata compatibility; do not run Step 323.3 now.
- Recommended next direction:
  - feature path: revisit Order Setup `Optimal Exit / Max Profit Exit` design;
  - architecture path: Review JSON schema/versioning and explicit legacy metadata migration policy.
