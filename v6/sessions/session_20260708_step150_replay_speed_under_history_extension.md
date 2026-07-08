# V6 Session - Step 150 Replay Speed Under History Extension

Date: 2026-07-08

## Completed

Step 150 verified replay speed and ownership while leftward historical extension
is active or recently loaded.

Commits:

- `a61053ee fix(v6): preserve replay append during history loads`
- `268bed4b test(v6): cover replay speed after history extension`

## Changes

- Fixed `leftward-history-extension-runtime` to refresh replay state immediately
  before prepending returned older bars, preventing stale cursor filtering from
  removing a replay candle appended while an older-window request was pending.
- Added runtime coverage for replay `Next` during an in-flight older-window
  request.
- Added browser coverage for replay `Next` immediately after a loaded
  older-window extension, including latest-candle visible latency and replay
  cursor ownership checks.
- Documented Step 150 and advanced the next planned chart foundation step to
  continuous leftward extension until exhausted.

## Verification

- `node v6/tests/replay-speed-history-inflight-step150-smoke.js`
- `node v6/tests/replay-speed-history-extension-browser-step150-smoke.js`
- `node v6/tests/leftward-history-hardening-step149-smoke.js`
- `node v6/tests/drag-triggered-history-extension-browser-step149-smoke.js`
- `node v6/tests/leftward-history-extension-step148-smoke.js`
- `node v6/tests/leftward-history-extension-browser-step148-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 151 should implement and gate continuous leftward extension until the
bar-data source reports no older bars. Keep request windows capped at the
canvas-left timeline boundary and preserve replay speed under active extension.
