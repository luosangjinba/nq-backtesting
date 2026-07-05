# Replay Viewport Intent

## Purpose

This is the first core V6 contract. It replaces V5's mixed time-range,
logical-range, follow/manual, viewport-demand, and append-path coupling with one
canonical viewport-intent model.

## Terms

- `replayCursor`: replay-owned latest revealed timestamp.
- `chartBars`: chart-data-owned bars available for a pane.
- `viewportIntent`: chart-viewport-owned instruction for how chartBars should
  be positioned on screen.
- `wall`: the screen position where the latest replay candle should appear.
- `defaultWall`: initial replay wall derived from presentation settings.
- `manualWall`: user-created temporary wall from native drag/zoom.
- `engineRange`: adapter-owned range representation required by the chart
  engine, such as Lightweight logical range.

## Intent Types

V6 starts with these viewport intents:

```js
{
  mode: 'replay-wall',
  origin: 'default' | 'manual',
  latestOffsetBars: number,
  spanBars: number | null,
  cursorTimestamp: number,
  revision: number
}
```

Rules:

- `origin: 'default'` and `origin: 'manual'` use the same projection algorithm.
- `latestOffsetBars` is the distance from latest rendered replay bar to the
  right side of the visible logical range.
- `spanBars` is the visible logical span when the user manually creates a wall.
- `revision` increments whenever the user creates or explicitly resets intent.
- Replay cursor movement updates `cursorTimestamp`; it does not change
  `origin`, `latestOffsetBars`, or `spanBars`.

## Ownership

Chart viewport runtime owns `viewportIntent`.

Replay runtime may publish cursor updates. It may not decide whether the active
intent is default or manual.

Bar data runtime may load older/newer bars. It may not alter viewport intent.

Chart data runtime may append/replace chart bars. It may not alter viewport
intent.

Adapter may translate intent to `setVisibleLogicalRange` or equivalent. It may
not store durable intent.

## Default Wall

Initial session load creates:

```js
{
  mode: 'replay-wall',
  origin: 'default',
  latestOffsetBars: presentation.rightOffsetBars,
  spanBars: null,
  cursorTimestamp: startBarTimestamp
}
```

On Play/Next, the latest candle remains at `latestOffsetBars` and older candles
move left.

## Manual Wall

Native drag or wheel while replay is active creates:

```js
{
  mode: 'replay-wall',
  origin: 'manual',
  latestOffsetBars: measuredLatestOffsetBars,
  spanBars: measuredVisibleSpanBars,
  cursorTimestamp: currentReplayCursor
}
```

The measurement must come from the chart engine's actual visible logical range
at the end of the native interaction. It must not be reconstructed only from a
time range.

On Play/Next, the latest candle remains at the manual wall and older candles
move left.

## Display-Window Loading

Display-window loading may change `chartBars`. It must not change
`viewportIntent`.

After any display-window append/replace, chart viewport runtime reapplies the
current intent to the new chartBars.

This is the specific V5 failure to avoid: older-window loading after a drag must
not restore only a time range and erase the manual logical wall.

## Adapter Projection

For Lightweight Charts, projection uses logical range:

```js
to = latestReplayBarLogicalIndex + latestOffsetBars
from = spanBars == null ? autoFrom(to) : to - spanBars
```

The adapter may choose `autoFrom` from viewport capacity for default wall. For a
manual wall, `spanBars` is required.

The adapter must expose enough test metadata to assert:

- latest replay bar logical offset;
- visible logical range span;
- current intent origin and revision.

## Forbidden

- Treating a time-based visible range as the canonical manual wall.
- Letting display-window loads or prefix loads overwrite viewport intent.
- Letting append/replace decide follow/manual state.
- Reconstructing manual wall after the fact from replay cursor and bar count
  when native logical range was available.
- Route UI directly combining replay cursor, data loading, and chart range
  writes.
- Passing V5 `visibleRange`/`manualLogicalAnchor` patches into V6 as the model.

## Required Tests

Single-pane browser tests must use real browser/native interaction where
possible:

- initial default wall plus Play/Next;
- drag left from initial state then Play/Next;
- drag right from initial state then Play/Next;
- wheel zoom from initial state then Play/Next;
- drag that triggers older-window loading then Play/Next;
- fast repeated Next from default wall;
- fast repeated Next from manual wall.

Each test must assert latest-candle logical offset, not just replay cursor text.
