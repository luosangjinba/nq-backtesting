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

- Pending.
