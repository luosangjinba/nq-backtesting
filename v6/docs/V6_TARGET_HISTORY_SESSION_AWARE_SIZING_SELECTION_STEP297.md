# V6 Step 297 - Target-History Session-Aware Sizing Selection

Date: 2026-07-10

## Decision

The next session-aware target-history sizing slice is **`1D` browser sizing
assertions**.

Do not extend request-sizing browser assertions to `1W` or `1M` yet.

## Basis

Step 296 proved the fixed-duration `8h` target-history browser path requests
the policy-sized target window.

For session-aware target history, the first bounded path should be `1D` because
the existing target-timeframe backend boundary explicitly covers `1D` target
bars, while `1W` and `1M` depend on broader calendar/materialization semantics.

Step 297 adds a pure selector:

- `selectSessionAwareTargetHistorySizingSlice`

The selector chooses `1D` only when both conditions are true:

- backend target history supports `1D`;
- display capabilities enable `1D`.

If those conditions are not true, it returns no session-aware target.

## Rejected For Now

- **`1W` sizing assertions:** useful later, but should follow daily target
  history browser proof.
- **`1M` sizing assertions:** monthly target bars are the broadest calendar
  case and should not be first.
- **Runtime sizing changes:** no browser evidence currently shows underfill or
  over-fetch.

## Next

Step 298 should add a focused browser assertion for `1D` target-history request
sizing. It should keep source bars preserved for `1m` round trips and should
run the Step 293 readout regression pack.

## Verification

- `node v6/tests/target-history-session-aware-sizing-selection-step297-smoke.js`
- `node v6/tests/target-history-request-sizing-step295-smoke.js`
- `node v6/tests/target-timeframe-domain-step280-smoke.js`
- `git diff --check`
