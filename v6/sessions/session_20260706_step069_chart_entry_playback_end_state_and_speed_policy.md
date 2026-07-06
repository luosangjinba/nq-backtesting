# V6 Step 69 - Chart Entry Playback End-State And Speed Policy

Date: 2026-07-06

## Summary

Step 69 tightened automatic playback edge behavior after Step 68 established the
chart-entry auto-play owner.

Changes:

- added `chartEntryAutoPlay.setSpeed`;
- routed transport speed changes through the auto-play owner while playback is
  active;
- kept paused speed changes as transport UI state only;
- preserved timer lifecycle inside `runtime.chartEntryAutoPlay`;
- added a browser gate for active speed change and end-of-session auto-stop.

Transport still does not own timers, replay cursor, chart data, viewport intent,
or chart adapter state.

## Browser Gate

`chart-entry-playback-policy-browser-smoke.js` creates a short session, starts
auto-play, changes speed while playback is active, waits for the session to
reach `ended`, and verifies:

- auto-play owner speed is updated while still playing;
- replay reaches `ended`;
- auto-play owner stops itself;
- transport state and DOM dataset reconcile to paused;
- chart data and chart surface stay in sync;
- latest candle remains inside the projected visible range.

## Commits

- `93f799f7 docs(v6): scope step sixty nine playback policy`
- `9df04628 feat(v6): route active playback speed through owner`
- `330cb94e test(v6): verify playback policy browser flow`

## Verification

- `node v6/tests/chart-entry-auto-play-runtime-smoke.js`
- `node v6/tests/chart-entry-playback-policy-browser-smoke.js`
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

Step 70 should define playback period sync policy: the transport period menu and
sync toggle need an owner, and synced playback period should follow active pane
display timeframe without turning shell DOM into state ownership.
