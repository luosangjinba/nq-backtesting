# V6 Step 92 - Session Copy Owner Contract

Date: 2026-07-07

## Summary

Step 92 defined the Session Copy owner contract before enabling the Recent
Sessions Copy action.

Changed:

- added `v6/src/session/session-copy-contract.js`;
- exposed the owner id, metadata-only allowed fields, blocked stateful fields,
  id policy, and name policy;
- kept Copy disabled in Recent Sessions;
- extended row-action smoke coverage so Copy has an explicit owner contract but
  still cannot be activated from the dashboard;
- preserved global boundary coverage for session modules.

## Boundary

Copy is contract-only in this step. It remains disabled.

The owner is `session-repository`. Copy may create metadata records only when a
future step implements the repository-owned action. It must not copy bars,
chart state, replay state, viewport state, orders, journal entries, or calendar
data. Dashboard must not clone or persist copied sessions directly.

## Commits

- `bc7b48f0 feat(v6): add session copy contract`
- `820be36b test(v6): guard session copy boundaries`

## Verification

- `node v6/tests/session-copy-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/session-domain-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 93 should implement the metadata-only Copy action through the
`session-repository` owner contract before enabling the Recent Sessions Copy
button.
