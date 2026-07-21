# V7 R5.6 Corrective Human Review

Status: fourth-review corrections automated-complete; fifth human review pending

Browser URL: `http://127.0.0.1:8007/v7/app/`

Use Chrome and hard-refresh with `Ctrl+Shift+R` before starting.

## 1. Create And Directly Open A Session

Create this Session:

- Name: `R5.6 Recheck`
- Instrument: `NQ`
- Start: `2026-05-01 12:40`
- End: `2026-05-11 12:40`

After Create Session, the exact new `R5.6 Recheck` chart must open directly.
The app must not first return to the Replay sessions list.

## 2. New York Session Input, Chart Time, And No-Future Behavior

- The form labels Start and End as New York time.
- Session/Visible through metadata shows `12:40 EDT`, independent of the
  browser's Pacific timezone.
- The chart axis uses the same New York exchange time; the last initial candle
  is `12:40`, not `15:40`.
- Future minutes must not appear. One Next bar reveals exactly one source
  minute.
- After switching to RTH, the axis must not use Pacific `06:30–13:14`
  semantics.

Optional direct RTH-tail check: create another NQ Session with Start
`2026-05-04 13:14`. In RTH, its last eligible source minute must display as New
York `16:14`.

## 3. Aggregate Candle Display Placement

Return to `R5.6 Recheck` and inspect both ETH and RTH after each timeframe
switch. Both modes use the same exchange-clock completion grid:

- `4m`: completion slots are `:03/:07/:11/:15/...`; the initial last candle is
  at `:43`, never RTH `:01/:05/:09/...`.
- `30m`: completion slots are `:29/:59`; the initial last candle is at `:59`.
- `1h`, `2h`, `4h`, `8h`, and `12h`: the completion minute is `:59`, never
  RTH `:29`.

An aggregate candle may be displayed at its bucket's completion-minute slot,
but its OHLC must contain only revealed source minutes. Next bar still advances
exactly one source minute and must not reveal future data.

## 4. Latency, Dragging, And Refresh Feedback

- Switch among `5m`, `15m`, `1h`, and `12h`; no operation may enter the prior
  20-second stall or leave the chart effectively undraggable.
- Repeated higher-timeframe Next actions should update the current candle
  smoothly.
- Low→high timeframe replacement must not compress all candles against the
  right side or leave a large empty left margin that requires another click to
  repair.
- After the high-timeframe switch settles, dragging must respond immediately;
  reaching a real history boundary loads one bounded chunk, not a recursive
  foreground chain.
- ETH→RTH should settle without the previous perceptible cache-hit stall.
- Reset view must not flash `Updating…` beside the controls.
- Cache-hit TF, ETH/RTH, and Next actions must not flash dimming, text, or a
  centered overlay.
- A real cache miss longer than about 500 ms may subtly dim the accepted chart,
  but must not clear candles, shift layout, or show centered loading text.

## 5. Previously Accepted Behavior Smoke Check

- ETH→RTH→ETH does not move the Replay cursor.
- Drag left to the history boundary twice; each pass loads earlier history and
  does not move Visible through.
- Plot wheel changes only horizontal zoom; price-axis wheel changes only
  vertical zoom.
- Reset view restores the default horizontal wall and price autoscale without
  moving Replay.

## 6. Third-Review Continuity Regression

Using `R5.6 Recheck` in `1m`/ETH, drag to the left history boundary twice, then:

1. switch to `1h` and confirm the chart still reaches the Replay-visible tail;
2. scan the loaded history and confirm there is no approximately ten-day empty
   interval or discontinuous price jump;
3. switch ETH→RTH→ETH and confirm neither transition creates an internal empty
   interval or leaves the previous candles frozen on screen;
4. switch between `2m` and `1h` once more and confirm every replacement settles
   without needing another click to make candles appear.

## 7. Rapid Earlier-History Responsiveness

On each representative timeframe, especially `1m`, `1h`, `8h`, and `12h`:

1. rapidly drag candles right several times until a large blank area appears at
   the left boundary and history loading begins;
2. keep moving the mouse over the chart while loading; pointer interaction must
   continue responding rather than freezing for two to three seconds;
3. repeated releases during one pending load may coalesce into at most one
   queued continuation and must not create an unbounded request chain;
4. after loading settles, earlier candles appear atomically, the chart remains
   draggable, and Visible through/Replay do not move.

## Review Result

Reply with one of:

- `R5.6复审通过`
- `R5.6复审未通过：第 N 项，现象……`

R6 remains blocked until acceptance is explicitly reported.

## Third Human Review Result — Rejected

The 2026-07-21 review found two remaining correctness failures after switching
Session Hours and/or timeframe:

1. candles can stop extending through the expected loaded interval after an
   ETH/RTH or timeframe replacement;
2. switching to `1h` can expose an approximately ten-day interval with no
   candles followed by a discontinuous price jump.

The higher-timeframe latency is materially improved and must not regress, but
it remains a future optimization target. R6 stays blocked while the two data
continuity failures are corrected and re-reviewed.

## Third-Review Corrections

- replacement retains only an exactly adjacent older source-window chain;
  overlapping or separated legacy windows cannot be spliced into a new target;
- Projection rejects any internal request-window gap before chart publication;
- a dragged low-timeframe wall that maps wholly before a smaller aggregate
  series is repaired to a valid transient Lightweight Charts range without
  mutating canonical Viewport intent;
- real Chrome now executes history expansion→`1h`→RTH→ETH and asserts that the
  chart reaches the Replay tail and that the maximum candle interval stays
  below four days. The measured `1h` ETH maximum is 50 hours, representing the
  normal weekend rather than the rejected ten-day hole.

All automated gates pass. Perform the fourth human review above.

## Fourth Human Review Result — Rejected

The 2026-07-21 review found that rapidly dragging candles right to expose a
large blank left area can enqueue/accumulate earlier-history work on every
timeframe. During the roughly two-to-three-second history materialization the
browser main thread becomes unresponsive to mouse input. The supplied `8h`
screenshot shows 1,348 accepted aggregate bars and a wall around September,
despite the Replay cursor remaining at May 1, which is evidence that repeated
bounded chunks have accumulated into one increasingly expensive full
projection/repaint path.

The fourth review is rejected. Preserve data continuity and all prior semantic
fixes, but make rapid boundary interaction coalesced and main-thread responsive
before requesting another review.

## Fourth-Review Corrections

- validated Raw Bars/Batches retain an internal immutable trust marker, so
  downstream Projection no longer revalidates hundreds of thousands of values;
- fixed-duration aggregation validates untrusted direct input but uses the
  trusted Raw Bar path during normal Projection;
- modern New York wall conversion uses deterministic DST boundaries rather
  than per-bar `Intl` work while preserving spring/fall transition fixtures;
- history extension is now a pure incremental Projection operation over the new
  chunk plus one adjacent boundary chunk; Projection owns boundary-bucket
  rebuilding and accepted-tail merging;
- logical V4 requests above seven days use contiguous transport chunks with a
  main-thread yield between responses, while Bar Data receives one original
  request identity and one complete Raw Batch;
- real Chrome rapid `8h` dragging coalesces to two revisions, loads 239 candles
  in about 1.68 seconds, observes no 200ms long task, and keeps the event-loop
  sampling interval below about 125ms instead of the prior 695ms stall.

All automated gates pass. Perform the fifth human review above.
