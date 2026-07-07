# V6 Step 96 - Calendar Owner Contract

Date: 2026-07-07

## Summary

Step 96 defined the Calendar owner contract before exposing any Recent Sessions
Calendar row action.

Changed:

- added `v6/src/calendar/calendar-contract.js`;
- exposed the `calendar-runtime` owner id;
- defined first-pass calendar/economic-event metadata fields;
- defined blocked integrations for chart, replay, bars, viewport, orders,
  journal, and dashboard direct access;
- kept command, provider, persistence, and write surfaces marked not ready;
- kept the Recent Sessions Calendar action hidden/disabled;
- extended row-action and global boundary smoke coverage.

## Boundary

This step is contract-only. Calendar remains hidden/disabled from Recent
Sessions.

Calendar modules must not load bars, open chart runtime, advance replay, touch
viewport state, mutate journal, read orders, access dashboard state, register
commands, use browser storage, make network requests, or query providers until
those owner surfaces are explicitly introduced.

## Commits

- `ff91676b feat(v6): add calendar owner contract`
- `ad13a835 test(v6): guard calendar owner boundaries`

## Verification

- `node v6/tests/calendar-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 97 should audit the completed Recent Sessions row action ownership set
before any further row-action feature expansion.
