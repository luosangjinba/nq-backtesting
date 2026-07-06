# V6 Step 81 - Session Metadata Persistence Adapter

Date: 2026-07-06

## Summary

Step 81 implemented the first durable session metadata adapter.

Session metadata now persists through:

- `createSessionMetadataStorage`;
- injected `metadataStore` support in `createInMemorySessionRepository`;
- app-level injection of the metadata-backed repository into session runtime.

The persisted format stores only:

- session metadata records;
- active session id;
- storage version.

It does not store bars, chart data, replay state, viewport intent, or pane/chart
adapter state.

## Behavior

- Dashboard-created sessions survive page reload.
- Restored session rows appear on the session dashboard.
- Listing restored sessions does not load bars or chart data.
- Opening a restored session remains the explicit entry path into the chart
  workstation.
- Empty, corrupt, or unsupported-version storage falls back to an empty metadata
  repository.

## Commits

- `8f1cd83d docs(v6): scope step eighty one session metadata`
- `172bb8ea feat(v6): persist session metadata`
- `4eb472e6 test(v6): verify durable session metadata`

## Verification

- `node v6/tests/session-metadata-storage-smoke.js`
- `node v6/tests/session-dashboard-persistence-boundary-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `git diff --check`

## Next

Step 82 should add metadata-only delete support for dashboard session rows. Keep
delete independent from chart data, replay state, bars, and viewport intent.
