# Step 403 - Go-to Schedule Domain And Preferences Contract

Status: completed.

## Outcome

V6 now has a pure, replay-independent schedule domain for the five first-slice
Go-to actions and a separate persisted preference owner for their four New York
wall-clock anchors.

No Go-to menu action is enabled yet. This step does not read or mutate Replay,
request Bar Data, materialize Chart Data, or write a chart viewport.

## Schedule domain

The domain owns:

- `next-day-open`, `next-session`, `asian-session`, `london-session`, and
  `new-york-session` action identifiers;
- default `America/New_York` anchors: day open `18:00`, Asian `19:00`, London
  `02:00`, and New York `09:30`;
- strict `HH:mm` validation;
- a DST-aware wall-clock-to-real-instant utility through
  `Intl.DateTimeFormat` for external instant use;
- Replay candidate timestamps that preserve New York wall-clock fields in the
  existing ET-wall-clock epoch encoding;
- strictly-forward candidate generation bounded by Replay end and candidate
  count;
- chronological Next Session merging across Asian, London, and New York.

The real-instant utility does not use a fixed `UTC-4` or `UTC-5` rule. Tests
prove:

- `09:30` changes from `14:30Z` to `13:30Z` across the 2026 spring transition;
- nonexistent spring-forward wall times produce no candidate;
- repeated fall-back wall times expose both real instants in order;
- a candidate equal to the cursor is not returned;
- no candidate exceeds Replay end.

Step 405 corrected the candidate-output boundary after real V4/V6 time-domain
verification. Replay timestamps are UTC epoch seconds carrying ET wall-clock
fields, so New York `09:30` must remain internal `09:30Z`; converting it to
`13:30Z`/`14:30Z` would move the chart four/five hours. The DST-aware utility
remains valid, but Replay candidate generation no longer calls it.

The domain deliberately does not encode market holidays or weekend calendars.
Step 405 asks Bar Data whether each candidate has a nearby real source bar and
skips empty anchors through a bounded search.

## Preferences owner

`runtime.replay-navigation-preferences` owns:

- snapshot, update, and reset commands;
- the four validated anchor fields only;
- updated/reset events;
- a versioned `v6.replay-navigation.preferences` localStorage adapter;
- safe default fallback for missing, corrupt, invalid, or unsupported-version
  persisted data.

Silver Bullet preferences are rejected as unknown input in this first slice.
The preference runtime has no Replay, Bar Data, Chart Data, Chart Viewport, or
shell dependency.

## Commands

- `replayNavigationPreferences.getSnapshot`
- `replayNavigationPreferences.update`
- `replayNavigationPreferences.reset`

## Verification

- `node v6/tests/replay-navigation-schedule-step403-smoke.js`
- `node v6/tests/replay-navigation-preferences-step403-smoke.js`
- `node v6/tests/replay-navigation-step403-ownership-smoke.js`
- `node v6/tests/core-runtime-manifest-smoke.js`
- `node v6/tests/manual-next-session-gap-step258-smoke.js`
- `node v6/tests/auto-play-session-gap-step263-smoke.js`
- `node v6/tests/right-utility-rail-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

## Next recommendation

Step 404 should extract the smallest reusable forward source-cursor resolution
and pane materialization boundary from Manual Next before Go-to orchestration is
implemented.

This must be a behavior-preserving structural step. Manual Next, auto-play,
session-gap, HTF, multi-pane, viewport-intent, and visible-latency regression
packs must remain green. Do not enable the Go-to menu in Step 404.
