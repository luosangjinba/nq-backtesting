# Step 455 - Executable Canonical Test Runner

## Scope

Close the post-stabilization review finding that the canonical manifest named
tests but did not execute them as a suite. This Step changes test governance
only; it does not add product behavior.

## Changes

- Added a sequential canonical runner with non-zero failure propagation.
- Added `--list` and `--environment=<name>` audit/scope options.
- Added a pure selection boundary and smoke coverage.
- Renamed manifest coverage to `named-milestone-gates`.
- Renamed catalog coverage to `exhaustive-classification`.
- Documented the distinction in the current TODO and docs index.

## Verification

- `node v6/tests/canonical-test-runner-smoke.js`
- `node v6/tests/canonical-test-manifest-smoke.js`
- `node v6/tests/canonical-test-catalog-smoke.js`
- `node v6/tests/canonical-test-runner.js --list --environment=node`
- `node v6/tests/canonical-test-runner.js --environment=node` -> 6/6
- `node v6/tests/canonical-test-runner.js` -> 14/14
- `git diff --check`

The complete browser run required local loopback listening and passed outside
the restricted sandbox. The Step 187 measured Manual Next latency was 90.1ms.

## Result

The manifest is now an executable gate set. It deliberately does not claim
that all classified historical tests pass; that separate triage remains the
next catalog-maintenance Step.
