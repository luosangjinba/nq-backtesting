# V6 Step 68 - Chart Entry Auto Playback Tick Owner

Date: 2026-07-06

## Summary

Step 68 extended the chart-entry replay path from manual next to automatic
playback.

The new `runtime.chartEntryAutoPlay` owns automatic playback timer lifecycle:

- `chartEntryAutoPlay.start` marks replay playing and starts the owner timer;
- each timer tick dispatches `chartEntryManualNext.next`;
- `chartEntryAutoPlay.stop` clears the timer and pauses replay;
- transport play/pause dispatches chart-entry auto-play commands instead of
  `replay.play` or `replay.pause` directly.

The app now disables the legacy replay runtime's internal interval so the
chart-entry auto-play owner is the only automatic tick source in the workstation
path. The replay runtime still owns replay state and emits playback status.

## Browser Gate

`chart-entry-auto-play-browser-smoke.js` creates a session from the dashboard,
sets transport speed, clicks play, waits for multiple candles to append, pauses,
and verifies:

- replay cursor and revealed count advanced;
- chart-data and chart surface data length advanced together;
- transport state paused cleanly after stop;
- the latest candle remains inside the projected visible range.

`replay-transport-browser-smoke.js` was also moved off the old default-wall
transport path. It now validates next/play/pause/keyboard behavior through the
chart-entry owners.

## Commits

- `85554e7a docs(v6): scope step sixty eight autoplay`
- `d4bc7062 feat(v6): add chart entry autoplay owner`
- `3b02c2fb test(v6): verify chart entry autoplay browser flow`

## Verification

- `node v6/tests/chart-entry-auto-play-runtime-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/chart-entry-manual-next-browser-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 69 should tighten playback edge behavior: auto-stop at session end, speed
changes while already playing, and transport UI reconciliation when playback
stops itself.
