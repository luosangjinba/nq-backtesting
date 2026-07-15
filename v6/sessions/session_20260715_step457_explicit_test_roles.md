# Step 457 - Explicit Test Roles

## Scope

Remove the catalog rule that inferred `support` from TODO/INDEX source reads.
No product feature or production source behavior was added.

## Substeps And Commits

1. `e5062b98` defined the explicit role metadata contract.
2. `d8872755` routed infrastructure support through explicit metadata.
3. `878e8bce` executed and inventoried all 155 historical-ledger candidates.
4. `fb420742` removed source inference, connected explicit quarantine and runner
   roles, and made the static audit execute gates only.

## Evidence

- Exhaustive catalog: 751/751 classified.
- Roles: 539 gate, 159 quarantine, 22 runner, 31 support.
- Historical-ledger audit: one current gate and 154 explicit quarantines.
- Root Node gates: 371/371 passed.
- Static architecture gates: 47/47 passed; 75 quarantines and four runners were
  excluded by role.
- Named canonical suite: 14/14 passed in 23707ms.
- `git diff --check` passed.

## Outcome

Reading a governance document no longer changes a test's execution role.
Unknown executable tests default to gate, and every non-gate exception in this
migration is reviewable from explicit metadata.
