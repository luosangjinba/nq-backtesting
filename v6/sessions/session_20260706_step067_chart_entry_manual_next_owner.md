# V6 Step 67 - Chart Entry Manual Next Owner

Date: 2026-07-06

## Summary

Step 67 moved the transport `next` action onto the chart-entry replay path.

The new `runtime.chartEntryManualNext` owns the manual-next workflow:

- dispatch `replay.next`;
- load the cursor bar through `barData.loadWindow`;
- append only the cursor bar through `chartData.appendBars`;
- expose cloned state summaries and an advanced event.

Transport now dispatches `chartEntryManualNext.next` instead of the older
`defaultWall.next` path.

## Cursor Projection Fix

The browser gate exposed a real session-entry projection bug: the bars API can
return bars beyond the replay cursor. The initial chart-entry projection was
using the last cached bar as the default-wall start index, which could display
future candles before replay reached them.

Projection preparation now resolves the start index from `plan.cursorTime`.
If an exact cursor bar is unavailable, it uses the nearest past bar and fails
when the cache does not cover the cursor at all.

Manual next also loads a two-bar backward cursor window to avoid same-start/end
API windows, then appends the exact cursor bar when available.

## Commits

- `ad398407 docs(v6): scope step sixty seven manual next`
- `5f558c9d feat(v6): add chart entry manual next runtime`
- `7200225a feat(v6): route transport next through chart entry`
- `22e4104a fix(v6): align chart entry cursor projection`
- `9ab77168 test(v6): add chart entry manual next browser smoke`

## Verification

- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/chart-entry-manual-next-browser-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-runtime-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 68 should extend the same chart-entry owner chain to automatic playback
ticks. Transport play/pause should control timer lifecycle through a dedicated
owner, while each tick reuses the manual-next path or an equivalent shared owner
API.
