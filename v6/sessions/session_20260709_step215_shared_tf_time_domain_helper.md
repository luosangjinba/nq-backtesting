# V6 Session - Step 215 Shared TF / Time Domain Helper

Date: 2026-07-09

## Summary

Step 215 added the first shared TF/time domain boundary and routed the pure
`chart-data-projection` domain through it without changing projection output.

## Changes

- Added `v6/src/time-domain/time-domain.js`.
- Added `v6/tests/time-domain-helper-step215-smoke.js`.
- Updated `v6/src/chart-data-projection/chart-data-projection-domain.js` to use
  shared helpers for:
  - minute timeframe normalization;
  - optional Unix-second timestamp normalization;
  - source/target multiple validation;
  - display bucket start calculation.
- Updated `v6/tests/tf-projection-time-domain-audit-step214-smoke.js` so the
  audit guard now requires `chart-data-projection-domain.js` to consume the
  shared helper instead of carrying a local TF normalizer.

## Preserved Boundaries

- No display-timeframe runtime rewrite.
- No default-wall projection rewrite.
- No new supported TFs.
- No indicators, Pine Script, SMC/ICT overlays, trading, order tickets, prop
  firm rule engines, or pseudo-live simulation behavior.
- No shell/route ownership of TF math, projection, bar requests, replay cursor,
  viewport intent, or chart series writes.

## Verification

- `node v6/tests/time-domain-helper-step215-smoke.js`
- `node v6/tests/display-timeframe-projection-domain-step193-smoke.js`
- `node v6/tests/tf-projection-time-domain-audit-step214-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

## Commits

- `82098198 feat(v6): add shared TF time domain helper`
- `6e34ef05 refactor(v6): route projection through time domain helper`

## Next

Step 216 should retire the independent `display-timeframe` HTF projection path
by routing display-timeframe and default-wall projection consumers through the
projection owner/domain path while preserving browser behavior.
