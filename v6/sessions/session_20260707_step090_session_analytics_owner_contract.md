# V6 Step 90 - Session Analytics Owner Contract

Date: 2026-07-07

## Summary

Step 90 defined the `session-analytics` owner contract before enabling the
Recent Sessions Stats action.

Changed:

- added `v6/src/session-analytics/session-analytics-contract.js`;
- exposed the owner id, allowed metadata fields, read-only contract flags, and
  explicit empty metric placeholders;
- added a snapshot helper that normalizes session metadata without loading bars,
  opening charts, advancing replay, touching viewport intent, or reading future
  owners;
- added contract smoke coverage;
- extended row-action and global boundary smokes so Stats remains disabled and
  analytics cannot import or command chart, replay, bars, viewport, orders,
  journal, calendar, UI, storage, or network paths.

## Boundary

This step is contract-only. Stats remains disabled from Recent Sessions.

Analytics is allowed to read only session metadata fields and return unavailable
metric placeholders. It must not load bars, open chart runtime, advance replay,
touch viewport intent, mutate sessions, read orders, read journal entries, or
read calendar data until those owners expose explicit read contracts.

Dashboard must not compute analytics directly.

## Commits

- `18b71f81 feat(v6): add session analytics contract`
- `c2a32db6 test(v6): guard session analytics boundaries`

## Verification

- `node v6/tests/session-analytics-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 91 should add a read-only Session Analytics surface/model before enabling
the Recent Sessions Stats action. The first surface should show metadata and
explicit unavailable metric placeholders owned by `session-analytics`.
