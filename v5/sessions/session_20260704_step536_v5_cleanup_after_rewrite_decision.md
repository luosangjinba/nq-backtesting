# Step 536 V5 Cleanup After Rewrite Decision

## Status

Completed.

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
- Route-level `replayDisplayTimeframe` mirroring was removed in `649a95d`.
- Stale primary/non-primary coordinator smoke wording was updated in `c49a1ff`.
- The V5/V6 rewrite-decision audit now recommends `continue-v5`.

## Verification Log

- `node v5/tests/v5-v6-rewrite-decision-audit.js` passed with
  `recommendation: continue-v5`.
- `node v5/tests/pane-display-state-store-static-smoke.js` passed.
- `node v5/tests/chart-replay-pane-display-coordinator-smoke.js` passed.
- `node v5/tests/multi-pane-tf-change-next-fanout-browser-smoke.js` passed.
- `node v5/tests/multi-pane-timeframe-follow-browser-smoke.js` passed.
- `node v5/tests/replay-controls-browser-smoke.js` passed.
- `git diff --check` passed.

## Commits

- `59fec4b docs(v5): plan cleanup after rewrite decision`
- `85cb2bd refactor(v5): centralize default replay pane id`
- `649a95d refactor(v5): remove route replay timeframe mirror`
- `c49a1ff test(v5): update pane display coordinator wording`

## Result

Step 536 removes the mandatory cleanup debt from Step 535. Remaining uses of
`primary` are accepted compatibility surfaces: default layout pane id, DOM
labels, pane-shell compatibility, and split resize ratio keys.
