# V6 Step 22 - Transport Polish Baseline

Date: 2026-07-05

## Scope

Step 22 polished replay transport behavior while preserving the command-only UI
boundary. The transport still dispatches replay/default-wall commands and does
not import feature runtime internals.

## Commits

- `7d50951 feat(v6): sync replay transport playback state`
- `fc93c10 test(v6): verify transport external playback sync`

## Implementation Notes

- Replay transport now subscribes to replay loaded, playback-changed, and reset
  events to keep button text, pressed state, and `data-playback` synchronized.
- Speed remains transport-local UI state and is preserved when playback events
  arrive externally.
- Browser smoke now verifies external replay play/pause commands update
  transport UI without changing selected speed.

## Verification

- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 23 should define the first persistence boundary. Persistence should be an
adapter/repository path and must not restore chart, replay, data, or viewport
state directly.
