# Step 459 - Explicit Test Environments

## Problem

The catalog inferred test environment from browser, screenshot, and
real-api-browser filename fragments plus selected import text. This
misclassified static Node assertions as browser tests and made environment
routing sensitive to naming.

## Audit Result

- inferred non-Node files inspected: 192
- genuine local-browser tests or browser-pack runners: 173
- genuine browser plus real API service test: 1
- filename false positives that execute as Node assertions: 18

The explicit inventory lives in
v6/tests/test-environment-migration-step459.js. Browser ownership was checked
from direct/transitive harness dependencies and reviewed browser runner
membership, not from filenames alone.

## Migration

1. Freeze and verify the 173/1/18 audit result.
2. Route non-Node environments through explicit metadata.
3. Remove filename and source-text environment inference.
4. Execute the 18 restored Node classifications and all root/canonical gates.
