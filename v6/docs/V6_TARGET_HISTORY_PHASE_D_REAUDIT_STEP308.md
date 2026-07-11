# V6 Step 308 - Target-History Phase D Re-audit And Next Slice Selection

Date: 2026-07-10

## Decision

Step 308 re-audits target-history Phase D after completing browser coverage for
fixed-duration, daily, weekly, and monthly target-history success/fallback
paths.

The next bounded slice is **target-history browser pack runtime/cost control**.

## Coverage Summary

The compact Step 293 browser pack now covers eight real browser paths:

- fixed-duration target-history success;
- fixed-duration target-history fallback;
- daily target-history sizing success;
- daily target-history fallback;
- weekly target-history sizing success;
- weekly target-history fallback;
- monthly target-history sizing success;
- monthly target-history fallback.

The pure audit helper reports:

- expected paths: `8`;
- covered paths: `8`;
- missing paths: none.

## Selection

Added:

- `auditTargetHistoryPhaseDCoverage`
- `selectTargetHistoryPhaseDPostCoverageSlice`

With complete coverage, the selector chooses:

- `target-history-browser-pack-cost-control`

Reason:

- `target-history-browser-pack-complete-cost-control-next`

## Rejected For Now

- **High-timeframe history responsiveness audit:** valuable, but the browser
  pack now runs eight full browser paths. Keeping that pack affordable should
  happen before adding another responsiveness harness.
- **Replay coordination/materialization transition:** important later, but it
  is broader than a selection/audit step and should follow a cost-controlled
  regression base.
- **Runtime behavior changes:** no runtime mismatch was identified in this
  re-audit.

## Boundary

No runtime behavior changed.

Target bars still flow through `BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW`; shell
code observes runtime state/events and does not call `/v4/target_bars`
directly.

Replay cursor movement, no-bar gap skipping, chart viewport intent,
chart-engine behavior, journal, order-ticket, prop-firm, indicator, and seconds
behavior remain unchanged.

## Verification

- `node v6/tests/target-history-phase-d-reaudit-step308-smoke.js`
- `node v6/tests/target-history-phase-d-selection-step300-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-phase-d-reaudit-closeout-step308-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 309 should implement target-history browser pack runtime/cost control.
Keep it bounded to pack orchestration, timing reporting, or optional targeted
member selection; do not change chart-history runtime behavior.
