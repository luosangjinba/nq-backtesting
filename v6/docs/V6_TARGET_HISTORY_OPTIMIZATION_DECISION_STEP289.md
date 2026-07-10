# V6 Step 289 - Target-History Optimization Decision

Date: 2026-07-10

## Decision

The next optimization target is **a small diagnostics readout**, not activation
threshold tuning, source-window sizing changes, or fallback hardening.

## Basis

Step 288 added runtime diagnostics for:

- target-history latency;
- source-window fallback latency;
- target/source request counts;
- fallback reason;
- prepended bar count.

Step 289 adds a pure decision helper:

- `v6/src/chart-history/target-history-optimization-decision.js`

The helper selects among:

- `add-diagnostic-readout`
- `tune-activation-policy`
- `harden-fallback`

Using representative diagnostics, the current baseline selects
`add-diagnostic-readout`: target-history is faster than source-window fallback
and fallback rate is not high. Tuning activation thresholds or source windows
now would be premature because the next missing piece is operator-visible
feedback when high-TF history activates, succeeds, or falls back.

## Rejected For Now

- **Tune activation threshold/window sizing:** no current diagnostic evidence
  that `1h+` activation is too broad or too slow.
- **Harden fallback first:** fallback diagnostics exist, and high fallback rate
  is not the baseline selected by the decision helper.
- **Add larger UI controls:** too broad for the chart foundation slice.

## Next

Step 290 should add a small, non-invasive diagnostics readout for chart-history
leftward extension state. It should expose path, duration, request counts,
fallback reason, and prepended bar count without changing chart/replay behavior.

## Verification

- `node v6/tests/target-history-optimization-decision-step289-smoke.js`
- `node v6/tests/target-history-observability-closeout-step288-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
