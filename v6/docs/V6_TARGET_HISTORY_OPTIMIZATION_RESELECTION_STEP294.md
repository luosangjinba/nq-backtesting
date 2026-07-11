# V6 Step 294 - Target-History Optimization Re-selection

Date: 2026-07-10

## Decision

The next target-history optimization slice is **target-history request sizing**.

Do not tune activation policy or harden fallback first unless diagnostics later
show target-history is slower than source-window loading or fallback rate is
high.

## Basis

Step 293 added a compact browser regression pack for both target-history
diagnostics readout paths:

- success: `target-history`;
- fallback: `target-history-fallback-source-window`.

Step 294 extends the Step 289 pure decision helper with:

- `reselectTargetHistoryOptimization`

The re-selection keeps the original Step 289 priority order:

- high fallback rate -> `harden-fallback`;
- target slower than source -> `tune-activation-policy`;
- otherwise, if diagnostics readout is not complete -> `add-diagnostic-readout`.

Now that Step 290-293 completed and packaged the readout, the healthy baseline
re-selects:

- `tune-target-request-sizing`

That keeps the next change close to the remaining high-timeframe performance
question: how many target bars/windows should chart-history request per
leftward extension without over-fetching or under-filling the viewport.

## Rejected For Now

- **Activation policy tuning:** current representative diagnostics do not show
  target-history slower than source-window fallback.
- **Fallback hardening:** fallback behavior is visible and browser-covered, but
  high fallback rate is not the selected baseline.
- **Broad UI/settings controls:** no operator control surface is needed for the
  next optimization slice.

## Next

Step 295 should audit and, if bounded enough, implement target-history request
sizing for chart-history leftward extension. It should compare target bars
requested/prepended against viewport needs, keep source bars preserved for
`1m` round trips, and run the Step 293 regression pack.

## Verification

- `node v6/tests/target-history-optimization-reselection-step294-smoke.js`
- `node v6/tests/target-history-optimization-decision-step289-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `git diff --check`
