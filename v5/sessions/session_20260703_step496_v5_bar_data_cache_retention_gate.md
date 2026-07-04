# Step 496 - Bar Data Cache Retention Gate

Date: 2026-07-03

## Plan

1. Audit bar-data cache ownership and existing release/prune behavior.
2. Add a session/pane cache scope release command without changing cache keys
   or breaking cross-pane reuse.
3. Pass session/pane scope metadata from replay-owned bar requests.
4. Add a smoke that proves shared windows survive one pane release, final scope
   release defers deletion, and `barData.pruneCache` bounds retained windows.
5. Update lifecycle docs, TODO, and session handoff.

## Changes

- Added `BAR_DATA_COMMANDS.RELEASE_SCOPE`.
- Bar-data cached windows now keep optional `sessionId` / `paneId` scope
  metadata separately from instrument/timeframe/range cache keys.
- `barData.releaseScope` removes matching session/pane references. Shared
  windows are retained when other scopes still reference them.
- Final scope release defers deletion by default so delayed pan-back cache
  behavior is preserved.
- `barData.pruneCache` remains the capacity cleanup gate for deferred or least
  recently used windows.
- Replay bootstrap, prefix, display-window, and navigation controllers now pass
  session/pane scope metadata to bar-data load requests.
- Added `v5/tests/bar-data-cache-retention-smoke.js`.
- Updated lifecycle audit/specs and `v5/TODO.md`.

## Verification

- `node v5/tests/bar-data-cache-retention-smoke.js`
- `node v5/tests/bar-data-runtime-smoke.js`
- `node v5/tests/replay-display-window-cache-smoke.js`
- `node v5/tests/lifecycle-cleanup-static-smoke.js`
- `git diff --check`

## Next

- Step 497 should add a browser route teardown behavior smoke for stale
  controller timers/listeners after route switching.
