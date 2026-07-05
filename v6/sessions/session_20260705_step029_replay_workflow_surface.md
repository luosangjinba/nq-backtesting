# V6 Step 29 - Replay Workflow Entry Surface

Date: 2026-07-05

## Scope

Step 29 added a bounded Replay workflow entry surface. The panel reads existing
replay/default-wall state and exposes refresh, pause, and reset controls. It
does not load sessions, advance replay, load chart bars, own chart state, or
write viewport intent.

## Commits

- `019f20b feat(v6): add replay workflow surface controller`
- `4654b91 feat(v6): mount replay workflow surface`
- `2a7b98c test(v6): enforce replay workflow boundaries`

## Implementation Notes

- Added `v6/src/shell/replay-workflow-surface-model.js` and
  `v6/src/shell/replay-workflow-surface.js`.
- Mounted a compact Replay panel in the workstation shell.
- The controller dispatches only:
  - `replay.getState`
  - `defaultWall.getState`
  - `replay.pause`
  - `replay.reset`
- Boundary tests forbid `replay.loadSession`, `replay.next`, `replay.play`,
  `defaultWall.load`, `defaultWall.next`, chart/data/viewport commands, feature
  runtime internals, V4/vendor imports, storage, and network APIs.
- Browser smoke verifies the real shell mounts and opens the panel while the
  unloaded replay state stays unloaded.

## Verification

- `node v6/tests/replay-workflow-surface-controller-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `git diff --check`

## Next

Step 30 should add a bounded Journal workflow entry surface. It should use
existing journal and journal-persistence commands only and must not mutate
chart/replay/data/viewport state.
