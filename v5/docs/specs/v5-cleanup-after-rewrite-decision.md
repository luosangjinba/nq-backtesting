# Step 536 V5 Cleanup After Rewrite Decision

## Phase

Phase 3 replay workstation architecture cleanup.

## Purpose

Step 535 decided not to open V6, but continuing V5 depends on retiring the
remaining cleanup debt found by the rewrite-decision audit.

## Scope

Step 536 cleans:

- default replay pane hardcoding in bootstrap/prefix/navigation paths;
- route-level `replayDisplayTimeframe` mirroring;
- stale primary/non-primary wording in pane display coordinator tests.

## Rules

- Do not add new multi-pane behavior in this step.
- Keep `primary` as the default layout pane id, not as a state owner.
- Use explicit constants or runtime/layout contracts for default-pane
  compatibility.
- Active-pane toolbar timeframe must be derived from layout/replay context, not
  a route-local mirror that can drift.

## Acceptance

- `v5/tests/v5-v6-rewrite-decision-audit.js` recommends `continue-v5`.
- Step 534 structural guard still passes.
- Existing targeted multi-pane TF/Next browser smoke still passes.
- TODO/session handoff records that V5 can continue without V6 and without
  mandatory cleanup debt from Step 535.

## Step 536 Result

Completed. The rewrite-decision audit now returns `continue-v5` with no blocker
or cleanup buckets. Remaining `primary` usage is accepted default-pane/layout
compatibility, not display-state ownership.
