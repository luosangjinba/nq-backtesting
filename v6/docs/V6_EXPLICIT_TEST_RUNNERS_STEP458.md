# Step 458 - Explicit Test Runners

## Problem

After Step 457, the catalog still inferred `runner` from `regression-pack`,
`-pack.js`, and one static-audit filename. A filename cannot prove that a file
orchestrates other executable tests, so this rule hid ordinary assertions from
the gate set.

## Audit Result

- inferred runners inspected: 22
- genuine child-process orchestration entry points: 17
- ordinary assertion tests misclassified as runners: 5

The explicit inventory lives in
`v6/tests/test-runner-migration-step458.js`. Genuine runners import the Node
child-process boundary and execute member scripts. The five false positives
only run their own assertions and must return to gate classification.

## Migration

1. Freeze and verify the 17/5 audit result.
2. Route all genuine runners through explicit metadata.
3. Remove filename-based runner inference.
4. Execute the five restored gates and all root Node/canonical gates.

## Closeout

Step 458 is complete:

- all 17 genuine orchestration entry points use explicit runner metadata;
- all five filename false positives returned to gate classification and passed;
- filename-based runner inference is removed from the catalog;
- the catalog classifies 753/753 JavaScript files as 544 gates, 159
  quarantines, 17 runners, and 33 support files;
- root Node gates passed 375/375 on a clean full rerun;
- static architecture gates passed 51/51;
- the named canonical suite passed 14/14.
