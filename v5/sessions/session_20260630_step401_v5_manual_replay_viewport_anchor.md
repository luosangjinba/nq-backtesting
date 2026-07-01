# Step 401 - V5 Manual Replay Viewport Anchor

## Goal

Preserve the user's manually dragged chart viewport during replay transport
actions.

## Decision

Manual chart drag/zoom establishes a replay viewport anchor. After the chart is
in manual mode, Next, Previous, and Play must not automatically resume cursor
follow. Chart runtime should keep manual mode and shift the manual visible
range by the replay cursor delta so the newest replay bar keeps its screen
anchor instead of snapping to the canvas right edge.

Reset/follow cursor remains the explicit way to leave manual mode and resume
normal replay cursor follow.

Follow-up decision: right-side whitespace after a manual drag is part of the
manual anchor. The chart may keep a manual visible range whose `to` is beyond
the replay cursor, but it must render only bars at or before the replay right
edge. Lightweight native visible-range callbacks caused by runtime writes are
engine echo, not user input, and must not collapse the manual anchor.
Native Lightweight user drag callbacks must be interpreted with visible logical
range as well as visible time range, because the time range can end at the last
data bar even when the user dragged the newest K-line left and created right-side
empty space.
Replay transport command-in-flight is not a disabled UI state: duplicate clicks
and adjacent commands are serialized by the route, but Next/Previous/Play should
not flash disabled or show a forbidden cursor during normal use.

## Plan

- Document the manual replay viewport anchor decision in TODO/spec/session
  handoff.
- Make chart runtime translate a manual visible range when replay cursor
  updates arrive without explicit resume.
- Change replay Next/Previous transport renders to avoid forcing viewport
  follow resume; Play inherits the same behavior through Next.
- Keep initial load and Reset as explicit follow-resume paths.
- Add runtime and browser smoke coverage for manual anchor preservation after
  replay transport.
- Run targeted replay/chart smokes, full V5 smoke, and `git diff --check`
  before commit.

## Implementation Notes

- `chart.setViewportFollow` now preserves manual mode when `resume` is not
  passed and translates `visibleRange` by the new cursor delta.
- `replay.next` and `replay.previous` update the chart right-edge limit before
  rendering, then sync cursor state without `resumeViewportFollow`.
- `replay.play` inherits the same behavior because playback advances through
  `replay.next`.
- Initial session load and `replay.reset` still explicitly resume follow.
- Manual visible ranges are no longer clamped to the replay right-edge limit in
  chart state; rendered bars are filtered to the right-edge limit instead.
- The Lightweight adapter maps manual right-side whitespace to logical range so
  the engine preserves empty space after the last rendered bar.
- The Lightweight adapter also maps native visible logical range back into
  chart-runtime time range so user-created right-side empty space is captured as
  the replay transport anchor.
- Chart runtime guards the full programmatic adapter sync, including `setData()`,
  from native visible-range echo callbacks.
- Replay route no longer maps `commandInFlight` to button `disabled`; transport
  buttons remain visually accessible while `runReplayCommand` serializes replay
  commands.

## Manual Acceptance

- Dragging/panning the chart leaves it in manual viewport mode.
- Clicking Next/Previous or running Play after manual drag does not snap the
  newest K-line to the canvas right edge.
- The manual visible range moves by the replay cursor delta so the newest
  replay bar remains visible at the established anchor.
- Right-side empty space created by manual drag remains after Next/Previous/Play,
  while future bars after the replay cursor remain hidden.
- Clicking reset/follow cursor exits manual mode and resumes normal follow.

## Checks

- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/tests/replay-manual-viewport-follow-smoke.js`
- `node v5/tests/replay-viewport-follow-smoke.js`
- `node v5/tests/chart-interaction-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`
