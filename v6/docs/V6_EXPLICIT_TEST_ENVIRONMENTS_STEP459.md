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
- genuine Node plus real API service test: 1
- filename false positives that execute as Node assertions: 18

The explicit inventory lives in
v6/tests/test-environment-migration-step459.js. Browser ownership was checked
from direct/transitive harness dependencies and reviewed browser runner
membership, not from filenames alone.

## Migration

1. Freeze and verify the 173/1/18 audit result.
2. Route non-default and service-dependent environments through explicit metadata.
3. Remove filename and source-text environment inference.
4. Execute the 18 restored Node classifications and all root/canonical gates.

## Closeout

Step 459 is complete:

- 173 local-browser tests/runners use explicit `browser-local` metadata;
- one browser plus API test uses explicit `browser-service` metadata;
- one Node plus API test uses the new explicit `node-service` environment;
- 18 filename false positives returned to Node classification; their three
  current gates passed and 15 historical tests remain explicitly quarantined;
- filename and source-text environment inference is removed;
- a transitive dependency guard rejects browser-harness users without explicit
  browser environment metadata;
- the catalog classifies 755/755 JavaScript files across 580 Node, one
  node-service, 173 browser-local, and one browser-service entry;
- offline root Node gates passed 378/378, both service gates passed, static
  gates passed 51/51, and the named canonical suite passed 14/14.
