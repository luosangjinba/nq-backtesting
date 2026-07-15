# Step 458 - Explicit Test Runners

## Scope

Replace runner-role inference from filenames with an audited explicit runner
inventory. No production source or product behavior changed.

## Substeps And Commits

1. `cb2b5e36` audited the 22 inferred runners into 17 genuine orchestration
   entries and five ordinary assertion tests.
2. `0e5a137c` connected explicit runner metadata, removed filename inference,
   and returned the five false positives to the gate set.

## Evidence

- Five restored gates: 5/5 passed.
- Exhaustive catalog: 753/753 classified.
- Roles: 544 gate, 159 quarantine, 17 runner, 33 support.
- Static architecture gates: 51/51 passed.
- Root Node gates: the first run had one transient failure in
  `replay-navigation-real-service-step405-smoke.js`; it passed immediately in
  isolation, followed by a clean full rerun at 375/375.
- Named canonical suite: 14/14 passed in 23945ms.
- `git diff --check` passed.

## Outcome

Names containing `regression-pack`, `-pack.js`, or the static-audit filename no
longer decide execution role. Ordinary assertions default to gate; only the 17
reviewed child-process orchestration entries are runners.
