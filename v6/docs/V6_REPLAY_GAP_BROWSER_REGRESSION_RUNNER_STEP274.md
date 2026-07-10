# V6 Replay Gap Browser Regression Runner - Step 274

## Purpose

Step 274 adds one bounded browser regression command for replay no-bar gap
coverage.

Steps 258, 263, and 273 already prove the important browser paths individually.
This step groups those browser smokes so future replay, transport, and
display-timeframe changes can run one command before commit.

## Boundary

No production replay, chart-data, bar-data, chart-data projection, chart-engine,
viewport, pane, journal, order-ticket, prop-firm, indicator, or seconds behavior
changes.

The runner is test orchestration only. Each member smoke still owns its own V6
page harness lifecycle.

## Runner

New command:

- `node v6/tests/replay-gap-browser-regression-pack-step274-smoke.js`

The pack runs these browser smokes in order:

- `manual-next-session-gap-browser-step258-smoke.js`
- `auto-play-session-gap-browser-step263-smoke.js`
- `htf-manual-next-replay-gap-browser-step273-smoke.js`
- `htf-auto-play-replay-gap-browser-step273-smoke.js`

The runner executes each smoke as a child Node process, prints start/pass/fail
lines with duration, stops at the first failure, and exits with the failing
process code.

## Acceptance

- One command runs the browser replay gap coverage introduced by Steps 258, 263,
  and 273.
- Static smoke guards runner membership.
- The pack remains browser-focused and does not duplicate the runtime-only
  regression packs.
- Existing runtime/projection/pane/owner/boundary behavior remains unchanged.

## Verification

- `node v6/tests/replay-gap-browser-regression-pack-step274-static-smoke.js`
- `node v6/tests/replay-gap-browser-regression-pack-step274-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

After this runner is stable, the next bounded step should return to chart
foundation behavior rather than adding more replay-gap variants unless a manual
test exposes a specific uncovered gap.
