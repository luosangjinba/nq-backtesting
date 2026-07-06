# V6 Step 74 - Playback Period UI Feedback

Date: 2026-07-06

## Summary

Step 74 made ended replay state explicit in the transport UI.

Transport state now tracks `replayStatus` separately from the transport's
playing flag. When replay reaches `ended`:

- transport root exposes `data-playback-status="ended"` and `data-ended="true"`;
- Play button label becomes `Replay ended`;
- Play and Next buttons are disabled;
- period menu and sync toggle remain usable.

## Important Fix

Adding replay `advanced` event sync initially exposed a feedback bug: during
auto-play, each `replay:advanced` event has status `ready`, which briefly made
the transport think it was paused. That made the next Play click dispatch
`start` instead of `stop`.

The transport now preserves `playing: true` when a `ready` replay advance
arrives during active auto-play. `ended`, `paused`, and explicit playback
changes still stop the transport.

## Browser Gate

`chart-entry-playback-period-boundary-browser-smoke.js` now also verifies:

- large-period auto-play ending disables Play and Next;
- Play/Next labels are explicit at ended state;
- period menu can still select a new playback period after ended;
- sync toggle can still be changed after ended;
- Reset View preserves playback-period state and does not mutate replay/chart
  state.

## Commits

- `4109e1b9 docs(v6): scope step seventy four transport feedback`
- `e5ea90cb feat(v6): show ended replay transport state`
- `e228955e test(v6): verify ended transport feedback`
- `4d52b47e fix(v6): keep transport playing during replay advance`

## Verification

- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-runtime-smoke.js`
- `node v6/tests/chart-entry-auto-play-runtime-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/playback-period-browser-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

## Next

Step 75 should define the explicit restart/reset entry after replay has ended.
The Play button is now intentionally disabled at end, so restarting should be a
clear command path owned by replay/chart-entry rather than a hidden overload of
Play or Reset View.
