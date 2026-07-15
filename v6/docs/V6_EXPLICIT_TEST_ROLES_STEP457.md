# Step 457 - Explicit Test Roles

## Problem

The catalog inferred `support` when a test source mentioned `v6/TODO.md` or
`v6/docs/INDEX.md`. That rule could hide executable assertions merely because
they read governance documents.

## Decision

Test roles must come from explicit structural metadata:

- helper modules under the two declared helper prefixes are support;
- the canonical manifest and classifier domain are named support files;
- superseded executable tests require an explicit quarantine entry with reason
  and successor coverage;
- every other executable test defaults to gate unless it is an explicit runner.

The role metadata boundary is `v6/tests/test-role-manifest.js`. Source contents
must not decide a test role.

## Migration

1. Establish and verify the explicit support contract.
2. Route the existing 28 infrastructure support files through that contract.
3. Execute the 155 tests previously hidden by TODO/INDEX source inference.
4. Refresh current contracts and explicitly quarantine only superseded tests.
5. Delete the source-text role inference and run all resulting gates.
