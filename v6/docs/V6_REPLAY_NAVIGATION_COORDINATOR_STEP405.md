# Step 405 - Replay Navigation Coordinator

Status: completed.

## Outcome

V6 now has a command/event-owned Replay Navigation Coordinator for the five
first-slice Go-to actions. The right-rail menu remains disabled; Step 405 adds
runtime behavior and verification only.

The coordinator:

- reads Step 403 preferences and schedule candidates;
- verifies candidates against real source bars through the Step 404 resolver;
- stops Auto Play and pauses Replay before a successful jump;
- advances Replay exactly once through `SET_CURSOR_TIME`;
- materializes every supplied visible pane through the shared Step 404 pane
  boundary;
- reports completed/rejected outcomes and suppresses overlapping requests.

## Target resolution

`replay-navigation-target-resolver.js` generates at most 32 forward schedule
candidates by default. Each candidate asks Bar Data for a bounded forward
source window. The first real source bar from the anchor through 15 minutes
after it is accepted.

This proximity bound prevents a weekend/holiday candidate from incorrectly
matching a market open many hours later. Empty candidates are skipped; an
exhausted candidate list returns `no-real-source-bar` without pausing or moving
Replay.

## ET wall-clock correction

The Step 403 candidate generator originally converted New York wall-clock
anchors into real UTC instants. That was incompatible with the established V4/
V6 market-data time domain:

- DuckDB stores `America/New_York` wall-clock timestamps as naive values;
- the V4 API and V6 chart use UTC epoch seconds carrying those ET wall-clock
  fields;
- Session Setup converts `09:30` with `Date.UTC(...)`, producing internal
  `09:30Z`, not real-instant `13:30Z` or `14:30Z`.

Replay Navigation therefore preserves ET wall-clock fields in the existing
internal encoding: configured New York `09:30` resolves to Replay `09:30Z`
throughout the year. The genuine DST-aware
`resolveNewYorkWallClockInstants()` utility remains available and tested for
external real-instant use, but Replay candidates do not use it.

The real NQ service gate proved that a Friday cursor skips empty Saturday and
Sunday New York anchors and resolves the third candidate to Monday
`2026-05-04 09:30` with zero distance.

## Commands and events

Commands:

- `replayNavigation.getState`
- `replayNavigation.navigate`

Events:

- `replayNavigation:completed`
- `replayNavigation:rejected`

The navigate payload accepts an action and the visible `paneIds`. Step 406's UI
controller must supply chart-surface visible pane ids. If omitted in an owner-
side call, the coordinator falls back to the active pane.

Rejection reasons include:

- `replay-ended`;
- `no-forward-candidate`;
- `no-real-source-bar`;
- `in-flight`;
- `navigation-error`.

## Ownership

- Shell remains command-only and still has no active Go-to controls.
- Replay remains the only cursor/reveal owner.
- Bar Data remains the only market-data requester/cache owner.
- Chart Data/Projection owns pane records and no-future projection.
- Existing Chart Viewport intent is not reset by navigation.
- Chart Surface remains the only Lightweight Charts writer.
- The coordinator imports no DOM, Chart Data command, Chart Viewport command,
  or Lightweight Charts API.

## Verification

- `node v6/tests/replay-navigation-schedule-step403-smoke.js`
- `node v6/tests/replay-navigation-target-resolver-step405-smoke.js`
- `node v6/tests/replay-navigation-runtime-step405-smoke.js`
- `node v6/tests/replay-navigation-real-service-step405-smoke.js`
- `node v6/tests/replay-navigation-step405-ownership-smoke.js`
- `node v6/tests/replay-forward-source-cursor-resolver-step404-smoke.js`
- `node v6/tests/replay-cursor-pane-materializer-step404-smoke.js`
- `node v6/tests/manual-next-session-gap-regression-pack-step259-smoke.js`
- `node v6/tests/htf-replay-gap-regression-pack-step272-smoke.js`
- `node v6/tests/visible-kline-latency-regression-pack-step257-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/right-utility-rail-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

## Next recommendation

Step 406 should activate the existing menu through a focused shell controller,
without moving schedule or Replay logic into the DOM layer. It should:

1. dispatch the five action ids with current visible pane ids;
2. scope `Y/Z/I/L/N` shortcuts to workstation focus and ignore text/modal
   input ownership;
3. render busy, completion, and rejection feedback from coordinator events;
4. implement Custom Settings as a draft over the Step 403 preference owner,
   with Save, Discard, Reset to defaults, close, and validation;
5. keep Silver Bullet controls deferred.
