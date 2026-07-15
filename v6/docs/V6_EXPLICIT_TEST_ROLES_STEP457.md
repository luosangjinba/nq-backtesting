# Step 457 - Explicit Test Roles

## Problem

The catalog inferred `support` when a test source mentioned `v6/TODO.md` or
`v6/docs/INDEX.md`. That rule could hide executable assertions merely because
they read governance documents.

## Decision

Test roles must come from explicit structural metadata:

- helper modules under the two declared helper prefixes are support;
- the five catalog/triage metadata modules are named support files;
- executable orchestration entry points may be named runners;
- superseded executable tests require an explicit quarantine entry with reason
  and successor coverage;
- every other executable test defaults to gate unless it is an explicit runner.

The role metadata boundary is `v6/tests/test-role-manifest.js`. Source contents
must not decide a test role.

## Migration

1. Establish and verify the explicit support contract.
2. Route the existing 31 infrastructure support files through that contract.
3. Execute the 155 tests previously hidden by TODO/INDEX source inference.
4. Refresh current contracts and explicitly quarantine only superseded tests.
5. Delete the source-text role inference and run all resulting gates.

## Closeout

Step 457 is complete:

- 155 TODO/INDEX readers were executed and audited;
- `current-ledger-routing-smoke.js` remains a current gate;
- 154 archived-ledger snapshots are explicitly quarantined with a current
  successor;
- source-text role inference is removed;
- the catalog classifies 751/751 JavaScript files as 539 gates, 159
  quarantines, 22 runners, and 31 support files;
- root Node gates passed 371/371, static gates passed 47/47, and the named
  canonical suite passed 14/14.
