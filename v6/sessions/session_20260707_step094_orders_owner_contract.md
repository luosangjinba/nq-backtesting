# V6 Step 94 - Orders Owner Contract

Date: 2026-07-07

## Summary

Step 94 defined the Orders owner contract before exposing any Recent Sessions
Order row action.

Changed:

- added `v6/src/orders/orders-contract.js`;
- exposed the `orders-runtime` owner id;
- defined first-pass order metadata/read fields;
- defined blocked integrations for chart, replay, bars, viewport, journal,
  calendar, and dashboard direct access;
- kept command, persistence, and write surfaces marked not ready;
- extended row-action and global boundary smoke coverage.

## Boundary

This step is contract-only. Order remains hidden/disabled from Recent Sessions.

Orders modules must not load bars, open chart runtime, advance replay, touch
viewport state, mutate journal, query calendar, access dashboard state, register
commands, use browser storage, or make network requests until those owner
surfaces are explicitly introduced.

## Commits

- `8b61e350 feat(v6): add orders owner contract`
- `826a5e74 test(v6): guard orders owner boundaries`

## Verification

- `node v6/tests/orders-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 95 should define the Journal owner contract before exposing any Recent
Sessions Journal row action.
