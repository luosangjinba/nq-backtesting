# Step 536 V5 Cleanup After Rewrite Decision

## Status

Active.

## Trigger

Step 535 recommended continuing V5 instead of opening V6, but only after
cleaning the remaining audit debt.

## Goal

Make the V5/V6 rewrite-decision audit recommend `continue-v5` by retiring the
cleanup buckets found in Step 535.

## Substeps

1. Document Step 536 and commit the plan.
2. Replace default replay pane string literals in runtime paths with the default
   replay pane contract.
3. Remove route-level `replayDisplayTimeframe` mirroring and derive active-pane
   TF from layout/replay context.
4. Update stale primary/non-primary test wording.
5. Run audit and targeted multi-pane/replay verification.

## Progress

- Default replay pane hardcoding was centralized in `85cb2bd`.

## Verification Log

- Pending.
