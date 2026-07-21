# V7 R5.6 Corrective Human Review

Status: automated gate complete; human interaction/visual review pending

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

## 2. New York Chart Time And No-Future Behavior

- Session/Visible through metadata remains browser-local and shows `12:40 PDT`.
- The chart axis uses New York exchange time; the last initial candle is about
  `15:40`.
- Future minutes must not appear. One Next bar reveals exactly one source
  minute.
- After switching to RTH, the axis must not use Pacific `06:30–13:14`
  semantics.

Optional direct RTH-tail check: create another NQ Session with Start
`2026-05-04 13:14`. In RTH, its last eligible source minute must display as New
York `16:14`.

## 3. Aggregate Candle Display Placement

Return to `R5.6 Recheck` and inspect the last candle after each timeframe
switch:

- `4m`: completion slots are `:03/:07/:11/:15/...`; the initial last candle is
  at `:43`.
- `30m`: completion slots are `:29/:59`; the initial last candle is at `:59`.
- `1h`: the completion slot is `:59`.

An aggregate candle may be displayed at its bucket's completion-minute slot,
but its OHLC must contain only revealed source minutes. Next bar still advances
exactly one source minute and must not reveal future data.

## 4. Latency And Refresh Feedback

- Switch among `5m`, `15m`, and `1h`; there should be no previous obvious
  stall.
- Repeated higher-timeframe Next actions should update the current candle
  smoothly.
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

## Review Result

Reply with one of:

- `R5.6复审通过`
- `R5.6复审未通过：第 N 项，现象……`

R6 remains blocked until the first result is explicitly reported.
