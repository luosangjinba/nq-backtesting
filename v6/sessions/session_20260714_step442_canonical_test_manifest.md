# Session — Step 442 Canonical Test Manifest

Date: 2026-07-14

## Outcome

V6 now has one versioned test-manifest schema with explicit `node`,
`browser-local`, and `browser-service` environments plus `gate` and
`quarantine` roles. The first foundation selection records current architecture,
chart-engine, and browser gates and isolates the Step 187 assertion for Step
443 review.

The manifest is deliberately marked `foundation-selection`; Step 445 must
replace that status with an exhaustive executable catalog.

## Verification

- `node v6/tests/canonical-test-manifest-smoke.js`
- all manifest node gate scripts
- `git diff --check`
