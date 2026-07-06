# V6 Step 82 - Session Metadata Delete Action

Date: 2026-07-06

## Summary

Step 82 added metadata-only deletion for dashboard sessions.

The delete path now runs through:

- `SESSION_COMMANDS.DELETE`;
- `createInMemorySessionRepository().delete(id)`;
- session runtime command registration;
- the dashboard row delete control.

The action deletes only stored session metadata. It does not clear bars, chart
data, replay state, viewport intent, pane state, or chart adapter state.

## Behavior

- Deleting a missing session returns a no-op result.
- Deleting an inactive session removes only that row and preserves the active
  session id.
- Deleting the active session clears the repository active session id.
- Deleting active metadata does not emit session open/create events and does not
  drive chart entry, replay, bars, chart data, or viewport cleanup.
- Reload after delete restores the durable metadata state with deleted sessions
  absent.

## Commits

- `052fbfc4 docs(v6): scope step eighty two session delete`
- `6979bfca feat(v6): delete session metadata`
- `474b0e3d test(v6): verify session metadata delete`

## Verification

- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/session-metadata-storage-smoke.js`
- `node v6/tests/session-dashboard-persistence-boundary-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `git diff --check`

## Next

Step 83 should add metadata-only rename/edit support for dashboard session rows.
Keep edit actions out of chart data, replay state, bars, and viewport ownership.
