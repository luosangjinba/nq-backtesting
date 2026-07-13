# Step 404 - Shared Replay Cursor Materialization Boundary

Status: completed.

## Outcome

Manual Next no longer owns forward gap scanning, source-bar selection, pane
window loading, target-timeframe projection, and Chart Data writes in one
runtime. Those responsibilities now pass through two focused replay-owned
coordination boundaries:

- `replay-forward-source-cursor-resolver.js` finds the next real source bar and
  advances Replay through its command API;
- `replay-cursor-pane-materializer.js` loads and appends the resolved cursor for
  every requested pane, including fixed HTF and session-calendar projection.

The Go-to menu remains disabled. This is a behavior-preserving prerequisite for
the Step 405 coordinator, not user-facing feature wiring.

## Forward source cursor boundary

`resolveNextReplaySourceBar` performs bounded forward Bar Data scans from the
current cursor. It selects the earliest real source bar strictly after the
cursor, so session/weekend gaps do not require a duplicate trading calendar.

`advanceReplayToNextSourceBar` keeps Replay as the only cursor owner by sending
`SET_CURSOR_TIME`. Its legacy `NEXT` fallback remains available for isolated
harnesses that do not register cursor-time mutation. Exhausted bounded search
lands on Replay end exactly as Manual Next did before extraction.

Defaults are unchanged: `240` source bars per scan and at most `24` scans.

## Pane materialization boundary

`appendReplayCursorAcrossPanes` performs the existing pane-local path:

1. read each pane's symbol and display timeframe;
2. ask Bar Data for the bounded source window at the resolved cursor;
3. project fixed HTF or `1D`/`1W`/`1M` through Chart Data Projection when
   required;
4. append only the cursor bucket and its source evidence through Chart Data;
5. return pane-specific records and loading/projection diagnostics.

It does not mutate Replay, write a viewport, access the DOM, or call Lightweight
Charts. Manual Next now retains only replay-period iteration, command/event
wiring, result aggregation, and lifecycle state.

## Ownership constraints retained

- Bar Data remains the sole requester/cache owner.
- Replay remains the sole cursor/reveal owner.
- Chart Data and Projection remain the materialized-record owners.
- Chart Viewport intent is untouched by this extraction.
- Chart Surface remains the sole Lightweight Charts writer.
- Auto Play continues to invoke Manual Next, so both paths use the same shared
  resolver and materializer.

## Verification

- `node v6/tests/replay-forward-source-cursor-resolver-step404-smoke.js`
- `node v6/tests/replay-cursor-pane-materializer-step404-smoke.js`
- `node v6/tests/replay-cursor-materialization-step404-ownership-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/manual-next-session-gap-regression-pack-step259-smoke.js`
- `node v6/tests/playback-period-session-gap-regression-pack-step261-smoke.js`
- `node v6/tests/auto-play-session-gap-step263-smoke.js`
- `node v6/tests/htf-replay-gap-regression-pack-step272-smoke.js`
- `node v6/tests/multi-pane-replay-append-browser-step156-smoke.js`
- `node v6/tests/visible-kline-latency-regression-pack-step257-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

## Next recommendation

Step 405 should add the Replay Navigation Coordinator behind an explicit
command/event contract. It should consume Step 403 schedule candidates, verify
candidate-adjacent real source bars through the shared resolver, pause Replay,
advance the cursor once, and materialize all visible panes through the shared
pane boundary.

Before wiring UI, add coordinator tests for empty anchors, replay-end rejection,
in-flight suppression, no-future materialization, and multi-pane cursor
agreement. Do not activate the Go-to menu until Step 406.
