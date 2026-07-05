# V6 Rewrite Start Decision

## Decision

Open V6 and stop adding replay viewport/manual-anchor fixes to V5.

V5 remains useful as a reference implementation, test fixture source, and
negative-case archive, but V5 is no longer the active architecture for replay
chart interaction work.

## Why This Supersedes Step 535

Step 535 recommended continuing V5 because the static primary/non-primary audit
did not find a hard blocker. That conclusion was valid for the audited
multi-pane state-store question, but later manual replay testing exposed a
different hard blocker: the replay viewport/manual-anchor behavior depends on
several interacting representations and mutation paths that cannot be reasoned
about locally.

The same user-visible requirement kept requiring patches across:

- chart runtime time-based `visibleRange`;
- Lightweight Charts logical range;
- adapter native visible-range observation;
- replay display-window loading;
- viewport demand bridge;
- prefix/display bar replacement;
- append fast path;
- follow/manual mode restoration.

Manual testing still showed the same behavior after targeted fixes: dragging
away from the default wall did not establish a durable temporary wall; replay
Play kept walking candles rightward instead of pushing from the newly selected
latest-candle position.

That satisfies the Step 535 V6 trigger:

> the same class of bug can only be hidden by additional special-case patches.

## Root Cause Class

V5 does not have one canonical viewport model. It tries to synchronize
time-based visible ranges, chart-engine logical ranges, replay cursor
boundaries, display-window loads, and manual interaction state after the fact.

This creates a system where a change in one owner can silently erase or reinterpret
another owner's intent:

- native drag emits engine ranges;
- chart runtime stores derived manual state;
- replay viewport demand may load and replace display bars;
- replacement replays a time range but may drop logical anchor semantics;
- append/follow then applies a different viewport model.

The bug is not one missing field. It is a boundary design failure.

## V6 Direction

V6 must rebuild replay charting around a single explicit viewport-intent model.

Do not port V5's chart/replay viewport internals. Port only stable lessons,
data API usage, fixtures, and product-level acceptance tests.

## V6 Hard Rules

- Replay runtime owns cursor, reveal state, and session bounds only.
- Bar data runtime owns all market-data requests and caches only.
- Chart viewport runtime owns viewport intent and projection to chart-engine
  ranges.
- Chart engine adapter owns only engine API calls and native-event translation.
- Display-window loading must not overwrite viewport intent.
- Append/replace of bars must not decide follow/manual behavior.
- Native drag/zoom must produce a viewport-intent event, not a replay mutation.
- A manual anchor is represented as a first-class viewport intent, not as a
  time range plus later logical-range reconstruction.
- Initial default wall and user-created temporary wall use the same viewport
  intent type with different origin metadata.
- No feature route may directly couple chart range, replay cursor, and data
  loading in one flow.

## V6 Acceptance Before Feature Work

Before multi-pane, settings parity, or visual polish, V6 must pass a minimal
single-pane replay harness:

- initial load shows prefix context plus start bar;
- Play/Next from initial state keeps the latest candle on the default wall and
  pushes old candles left;
- native drag left from initial state creates a temporary wall at the latest
  candle's current screen position;
- native drag right from initial state does the same;
- wheel zoom away from default wall does the same;
- after manual wall creation, Play and Next keep the latest candle on that
  temporary wall;
- any display-window/prefix load caused by the drag does not alter the wall;
- append fast path remains possible, but never owns viewport semantics.

## V5 Handling

- Keep V5 changes available for reference, but do not spend more steps trying
  to make V5's manual-anchor wall production-correct.
- Use V5 tests as raw material only after rewriting them around V6 viewport
  intents.
- Update V5 TODO to point to V6 startup.
