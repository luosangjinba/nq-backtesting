# V6 Timeframe/Replay Foundation Regression Pack - Step 276

## Purpose

Step 276 adds one compact browser regression command for the chart-foundation
paths that now interact most often: display timeframe switching, interval menu
state, display-timeframe leftward history, session-aware HTF projection, and
replay no-bar gap behavior.

This pack is intentionally test orchestration only. It does not add product
features or runtime behavior.

## Boundary

No production display-timeframe, chart-data projection, chart-history, replay,
bar-data, chart-engine, viewport, pane, journal, order-ticket, prop-firm,
indicator, or seconds behavior changes.

Each member smoke remains the owner of its own browser page harness lifecycle.
The pack only runs them in a stable sequence.

## Runner

New command:

- `node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`

The pack runs:

- `display-timeframe-browser-smoke.js`
- `timeframe-menu-parity-browser-smoke.js`
- `display-timeframe-leftward-auto-chain-browser-smoke.js`
- `daily-projection-browser-step268-smoke.js`
- `weekly-projection-browser-step269-smoke.js`
- `monthly-projection-browser-step270-smoke.js`
- `replay-gap-browser-regression-pack-step274-smoke.js`

The runner executes each smoke as a child Node process, prints start/pass/fail
lines with duration, stops at the first failure, and exits with the failing
process code.

## Reuse Rule

The Step 274 replay-gap browser pack must be included as a single member:

- `replay-gap-browser-regression-pack-step274-smoke.js`

Do not duplicate the Step 274 member list inside this Step 276 runner. Step 274
owns replay-gap browser-pack membership.

## Acceptance

- One command runs the selected timeframe/replay browser foundation gates.
- Static smoke guards the runner membership and Step 274 reuse rule.
- The runner remains browser-focused and does not duplicate runtime-only packs.
- Existing runtime/projection/pane/owner/boundary behavior remains unchanged.

## Verification

- `node v6/tests/timeframe-replay-foundation-regression-pack-step276-static-smoke.js`
- `node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`
- `node v6/tests/replay-gap-browser-regression-pack-step274-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

After this runner is stable, the next bounded step should return to one
specific chart-foundation behavior exposed by manual testing or by this pack.
Do not start indicators, trading simulation, prop-firm workflow, or journal
feature work yet.
