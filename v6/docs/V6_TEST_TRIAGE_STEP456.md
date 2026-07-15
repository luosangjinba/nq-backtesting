# Step 456 - Post-Stabilization Test Triage

## Decision

The 27 failing Node gate-classified tests found by the post-stabilization review
must be handled explicitly. A passing canonical milestone runner does not make
tests outside that named set green.

The executable disposition list is
`v6/tests/test-triage-manifest-step456.js`:

- 22 tests protect current behavior or ownership and must be refreshed;
- 5 tests freeze a deliberately superseded phase and must be explicitly
  quarantined with named successor coverage.

## Rules

- Do not broaden heuristic `support` matching to hide a failure.
- A current-contract failure remains a gate until corrected.
- A superseded test may be quarantined only with a reason and an existing
  successor test.
- Quarantine is explicit metadata, not filename or source-text inference.
- Product code changes are allowed only if refreshed current-contract tests
  expose an actual current defect.
- Each repair group is independently verified and committed.

## Completion Gate

- every Step 456 entry has one explicit disposition;
- refreshed current-contract tests pass;
- quarantined tests appear as quarantine in the catalog and are not silently
  treated as support;
- all remaining Node gate-classified tests pass;
- the canonical milestone runner remains green.
