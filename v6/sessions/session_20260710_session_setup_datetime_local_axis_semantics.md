# V6 Session Setup Datetime-Local Axis Semantics

Date: 2026-07-10

Status: completed as an inserted bugfix before Step 258 selection.

## Context

The quick session form uses `datetime-local` inputs. Those values do not carry
timezone metadata. The setup model previously passed them to `new Date(value)`,
which lets the browser interpret them in the operator machine timezone.

On a UTC-7 machine, entering `2026-05-04 09:30` stored
`2026-05-04T16:30:00.000Z`, so chart entry and replay opened seven hours later
than the visible form value.

## Changes

- `session-setup-model` now parses `datetime-local` values as chart/data-axis
  literal UTC timestamps.
- Existing invalid-date validation remains intact by comparing UTC fields back
  to the input fields.
- Added a browser smoke covering the user-reported `2026-05-04 09:30` and
  `2026-04-01 05:23` session creation cases.
- Updated date-range and dashboard browser assertions to match the current
  session setup semantics and product wording.

## Verification

- `node v6/tests/session-setup-model-smoke.js`
- `node v6/tests/session-setup-datetime-local-browser-smoke.js`
- `node v6/tests/date-range-entry-viewport-alignment-browser-step247-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/session-domain-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `node v6/tests/date-range-boundary-entry-regression-pack-step255-smoke.js`
