# Session — Step 444 Browser Harness Naming

Date: 2026-07-14

## Outcome

Nine browser entrypoints whose names previously looked like Node-only smoke
tests now declare `browser` in their filenames. Pack references and targeted
historical evidence links follow the renamed files. The existing screenshot
entrypoint remains explicit without redundant renaming.

A self-check discovers direct CDP/V6 browser-harness imports and rejects future
ambiguous filenames. It also records the local environment contract: Chrome,
loopback HTTP and debugging ports, and mandatory cleanup.

## Verification

- `node v6/tests/browser-harness-environment-contract-smoke.js`
- `node v6/tests/canonical-test-manifest-smoke.js`
- affected pack/static reference tests
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
