# Step 535 V5/V6 Rewrite Decision Audit

## Status

Active.

## Trigger

After Step 534, the core primary/non-primary display-state split was rebuilt,
but the project has accumulated enough multi-pane/replay history that a V6
rewrite may still be worth considering. This step turns that concern into a
bounded architecture decision.

## Goal

Decide whether to continue V5 or open V6 for multi-pane/replay, based on
evidence from code ownership and remaining debt.

## Substeps

1. Document V5/V6 decision rules and commit the plan.
2. Add a static architecture-debt audit for primary/default-pane usage,
   cross-runtime ownership, and obsolete test assumptions.
3. Run the audit and classify findings as blocker, cleanup, or acceptable
   compatibility.
4. Record the recommendation in TODO/session/spec.
5. Run Step 534 structural guard and relevant audit verification.

## Initial Hypothesis

Do not open V6 unless the audit finds a hard blocker in core chart/replay
display ownership. If remaining issues are limited to bootstrap defaults,
layout DOM compatibility, test wording, or small cleanup targets, continue V5
and clean them as explicit follow-up steps.

## Verification Log

- `node v5/tests/v5-v6-rewrite-decision-audit.js` passed.

## Audit Result

Recommendation: continue V5 with mandatory cleanup. Do not open V6 now.

No hard blockers were found:

- no old split display-state markers remain in core display files;
- no primary-special fan-out/display branch remains in the rebuilt core path;
- no route/feature direct chart series writes or bars API requests were found
  in the audited multi-pane replay ownership files.

Cleanup debt remains:

1. `v5/src/runtime/replay-bootstrap-controller.js` and
   `v5/src/runtime/replay-prefix-controller.js` still explicitly target
   `paneId: 'primary'`. This is currently default-pane bootstrap/prefix
   compatibility, not a fan-out blocker.
2. `v5/src/features/chart-replay/chart-replay-route.js` and
   `v5/src/features/chart-replay/chart-replay-pane-orchestrator.js` still
   mirror `replayDisplayTimeframe` for toolbar/status compatibility.
3. `v5/tests/chart-replay-pane-display-coordinator-smoke.js` still contains
   old primary/non-primary wording and should be updated to match Step 534.

Accepted compatibility:

- `DEFAULT_ACTIVE_PANE_ID = 'primary'` remains the layout default id.
- Layout DOM and split resize still use primary labels/ratio keys for
  compatibility. This is not display-state ownership.

## Recommendation

Proceed with V5. Use Step 536 for cleanup if manual testing of the original
multi-pane bug path is acceptable. Open V6 only if later evidence shows core
chart/replay display ownership still depends on a primary-owned state path.
