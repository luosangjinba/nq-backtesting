# V6 ETH/RTH Phase A3 — Replay And Projection Semantics

Status: accepted (2026-07-15)

## Scope

This step defines how the Phase A1/A2 Session Hours rules affect Replay,
multi-pane materialization, higher timeframes, persistence, caches, and
provenance. It does not implement commands or UI.

## Shared State Model

Session Hours mode is one Replay Session-scoped setting:

- supported values: `eth`, `rth`;
- default: `eth`;
- shared by every visible pane;
- persisted with the Replay Session, independently of the current layout;
- copied with a copied Session as an explicit source setting;
- exposed with a monotonic `sessionHoursRevision`;
- paired with a versioned `calendarRevision` used to evaluate exceptions.

There is still one Replay cursor, one playback state, and one reveal boundary
owner. A pane never owns an ETH/RTH mode or cursor in the first release.

## Cursor And Visible-Through Semantics

`cursorTime` remains the canonical source-clock position. Session Hours changes
which source bars are eligible for presentation and traversal.

`visibleThroughTime` is the newest eligible source bar at or before
`cursorTime`. The two values may differ.

Example:

- ETH cursor: Tuesday `03:00`;
- switch to RTH;
- cursor remains Tuesday `03:00`;
- visible-through becomes Monday `16:14`;
- no Tuesday overnight bar remains visible;
- Next advances to Tuesday `09:30`;
- Previous advances to Monday `16:13`.

The mode switch does not silently rewind or advance the source clock.

## Mode-Switch Transaction

A Session Hours coordinator applies a mode revision through public owner
commands:

1. capture current playback intent/speed and Replay cursor;
2. pause active playback through Replay's public command;
3. commit the Session Hours mode/revision;
4. replace all visible panes from eligible bars at or before the unchanged
   cursor;
5. reapply each pane's viewport intent through its owner;
6. resume playback only if it was playing before the switch and the replacement
   completed without error.

On failure, playback remains paused and the coordinator reports a rejected
revision. Stale work from an older revision cannot mutate Chart Data.

## Replay Traversal

In ETH mode, traversal uses every source bar returned by the source calendar.

In RTH mode:

- Next resolves the next eligible source bar, skipping overnight, maintenance,
  weekends, closures, and post-RTH bars;
- Previous resolves the previous eligible source bar;
- Play uses the same resolver as Next and never emits invisible cursor steps;
- speed controls scale eligible-bar steps, not wall-clock minutes;
- reaching a verified closure/early close continues at the next eligible bar;
- missing unverified source data follows existing gap diagnostics and is not
  silently treated as a holiday.

Replay commits one final resolved cursor per action. Session Hours must extend
the existing next/previous source-cursor resolution boundary rather than add a
second transport path.

## Restart Selection

Restart selection operates on currently visible bars:

- the blue marker snaps to an eligible displayed bar;
- an ineligible overnight timestamp cannot be selected while RTH is active;
- accepting the point rewinds the shared cursor to that source bar and removes
  that bar plus later eligible chart bars according to the existing Restart
  contract;
- every visible pane is replaced under the same Session Hours revision;
- switching back to ETH after rewind cannot reveal a bar later than the rewound
  cursor.

## Go-To And Drillback

Go-to retains its requested wall-clock target but resolves chart visibility
under the active mode:

- if the exact target is eligible and available, it becomes cursor and
  visible-through;
- if the target is ineligible, cursor may retain the requested source time while
  visible-through resolves to the latest eligible bar at or before it;
- the result clearly reports `target-ineligible-for-session-hours` rather than
  pretending an exact candle exists;
- the next transport step uses the normal eligible resolver.

Evidence drillback restores the evidence's recorded Session Hours mode and
calendar revision before pane replacement. It must not silently substitute the
currently selected mode.

## Intraday Projection

Eligibility is applied to source `1m` bars before aggregation.

ETH mode preserves the accepted existing fixed-duration bucket behavior until a
separate chart-product decision changes it.

RTH mode uses trading-date-local buckets anchored at `09:30` ET:

- buckets never cross an RTH trading-date boundary;
- supported fixed minute/hour timeframes advance from `09:30` by their duration;
- the final bucket ending at `16:15` may be partial;
- each candle timestamp is its bucket-open wall-clock timestamp;
- OHLCV is calculated only from eligible returned source bars;
- a source gap does not receive synthetic prices or volume.

Examples on a normal RTH day:

- `1h`: `09:30`, `10:30`, ..., `15:30` with a partial final candle;
- `4h`: `09:30–13:30` and partial `13:30–16:15`;
- `15m`: final full bucket opens `16:00` and ends at `16:15`.

This matches the FXReplay reference where the `4h` series changes after an
ETH/RTH switch.

## Session-Aware Projection

RTH session-aware candles are derived from RTH-eligible source bars:

- `1D`: one RTH trading-date candle;
- `1W`: eligible RTH daily candles grouped by the accepted trading-week key;
- `1M`: eligible RTH daily candles grouped by trading month;
- verified closures create no empty candle;
- early-close days create a shorter real candle;
- official extended trade-date exceptions use the versioned Calendar owner.

This intentionally exceeds TradingView's documented restriction that its
futures ETH/RTH selector affects intraday data only. V6 follows the supplied
FXReplay behavior and its validation/replay requirement for internally
consistent higher-timeframe evidence.

## Bar Data And Cache Identity

Bar Data continues to request/cache raw source windows by instrument,
timeframe, and range. It does not own Session Hours filtering.

Every projected/materialized cache or in-flight request that can differ by
Session Hours must include:

- instrument;
- source timeframe;
- display timeframe;
- range/cursor identity;
- `sessionHoursMode`;
- `sessionHoursRevision` where needed for stale-result rejection;
- `calendarRevision`.

Current ETH target bars cannot be reused for RTH projection. RTH initially uses
eligible source bars unless a future server target-bars contract explicitly
accepts and identifies Session Hours mode.

## Multi-Pane And Viewport

- all panes use one Session Hours revision;
- each pane retains its own instrument, timeframe, and viewport intent;
- mode replacement is coordinated across all visible panes;
- a pane may have a different final candle timestamp because of timeframe or
  instrument source availability, but none may exceed Replay cursor;
- mode changes do not reset manual/default wall intent;
- Chart Engine receives only final pane Chart Data and does not know ETH/RTH
  rules.

## Persistence And Provenance

Persist with the Replay Session:

- `sessionHoursMode`;
- the last accepted `calendarRevision` or its resolvable version reference.

Record on visibility-dependent artifacts:

- evidence/observation snapshots;
- trade-plan chart references;
- simulated execution/outcome context;
- screenshots;
- order origin/fill eligibility where order simulation later consumes hours;
- drillback descriptors.

Minimum provenance fields are `sessionHoursMode`, `calendarRevision`,
`cursorTime`, and `visibleThroughTime`. Historical artifacts retain their
original values even after preferences or calendars change.

## Accepted Invariants

1. A mode switch retains `cursorTime` and recomputes `visibleThroughTime`.
2. RTH Next/Previous/Play traverse eligible bars without invisible steps.
3. All visible panes replace under one Session Hours revision.
4. Eligibility precedes higher-timeframe aggregation.
5. RTH fixed-duration buckets anchor at `09:30` and never cross the RTH day.
6. ETH and RTH projections never share an ambiguous cache identity.
7. Switching mode never exposes a bar later than Replay cursor.
8. Evidence drillback restores its recorded mode and calendar revision.
9. Playback is resumed after a successful switch only when it was previously
   playing; failure leaves it paused.

## Next Step

ETH/RTH Phase A4 — implement the pure Session Hours/calendar domain contract
and fixtures for normal boundaries, weekend, DST, exception override, mode
switch visibility, eligible traversal, and RTH aggregation; then close Phase A.
