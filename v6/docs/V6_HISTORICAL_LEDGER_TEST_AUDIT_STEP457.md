# V6 Historical Ledger Test Audit — Step 457

## Scope

Step 457 audited every JavaScript file whose catalog role was previously
downgraded to `support` merely because its source opened `v6/TODO.md` or
`v6/docs/INDEX.md`.

## Result

- candidates: 155
- independently passing current-ledger contract: 1
- failing archived-ledger snapshots: 154
  - Node-classified: 137
  - browser-classified: 17

The one current contract is
`v6/tests/current-ledger-routing-smoke.js`. The other 154 files assert wording
or completion markers from phases that have already moved out of the current
ledger. Repairing those snapshots against current wording would make historical
tests pretend to be current behavior tests.

## Disposition

The 154 paths are explicitly enumerated in
`v6/tests/test-role-migration-step457.js` and quarantined as superseded
historical-ledger snapshots. Their successor is the current-ledger routing
contract. The catalog must not infer a test role from source text after this
migration.
