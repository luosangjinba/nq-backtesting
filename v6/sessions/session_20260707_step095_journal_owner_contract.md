# V6 Step 95 - Journal Owner Contract

Date: 2026-07-07

## Summary

Step 95 defined the Journal owner contract before exposing any Recent Sessions
Journal row action.

Changed:

- added `v6/src/journal/journal-contract.js`;
- exposed the `journal-runtime` owner id;
- defined first-pass journal metadata/read fields based on the current journal
  entry shape;
- defined blocked integrations for chart, replay, bars, viewport, orders,
  calendar, and dashboard direct access;
- kept the Recent Sessions Journal action hidden/disabled;
- extended row-action smoke coverage.

## Boundary

This step is contract-only. Journal remains hidden/disabled from Recent
Sessions.

Existing journal command and persistence surfaces remain owned by journal
modules. The dashboard must not compute, persist, or query journal data
directly, and the Recent Sessions row action must not touch chart, replay,
bar-data, viewport, orders, or calendar state.

## Commits

- `6ac21fc0 feat(v6): add journal owner contract`
- `2f28f9a7 test(v6): guard journal owner boundaries`

## Verification

- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/journal-runtime-smoke.js`
- `node v6/tests/journal-domain-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 96 should define the Calendar owner contract before exposing any Recent
Sessions Calendar row action.
