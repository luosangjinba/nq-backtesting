# V7 Viewport Runtime

Status: R4.4 pure pane-local intent foundation (2026-07-20)

## Ownership

`core.viewport-runtime` owns the semantic replay-wall intent for one pane in one
branded Session activation. R4.4 is pure: it creates and transforms immutable
intent values and projects transient logical-range instructions, but owns no
chart instance or mutable application state yet.

It performs no chart write, Replay mutation, Bar Data request, projection,
persistence, DOM work, notification, or Lightweight Charts call.

## Intent Contract

The durable semantic value contains:

- Session identity, activation generation, and opaque pane identity;
- `default` or `manual` origin;
- latest replay-bar offset from the visible right wall;
- a required manual visible span, while default span remains presentation-owned;
- accepted Replay cursor epoch;
- revision incremented only by native manual capture or explicit Reset/Follow.

Replay cursor movement preserves origin, offset, span, scope, and intent
revision. Snapshot replacement and history extension have no intent API and
therefore cannot reset a manual wall.

## Logical Projection

Native drag/zoom completion is measured as:

```text
latestOffsetBars = range.to - latestLogicalIndex
spanBars = range.to - range.from
```

Projection uses the same formula for default and manual intent:

```text
to = latestLogicalIndex + latestOffsetBars
from = to - resolvedSpanBars
```

When new Replay bars increase the latest logical index, both range boundaries
move by the same delta. The latest candle remains at the existing wall and
older candles move left. The adapter's transient `from`/`to` values are never
stored as canonical product intent.

## V6 Disposition

Retained and re-derived:

- default and manual walls share one projection rule;
- manual wall measurements come from the native logical range;
- Next/Play and data replacement preserve manual intent;
- Reset/Follow is explicit.

Rejected:

- chart-data, resize, mouse movement, retry, or event chains completing pending
  viewport work;
- time ranges as canonical manual walls;
- append/replace paths deciding follow/manual state;
- route/UI code combining Replay, data loading, and chart-range writes.

## Gate

`tests/viewport-runtime-harness.js` proves pane/Session/activation isolation,
default and manual projection, stable walls across Replay movement, explicit
reset, immutable branded values, and 13 negative controls. H014 becomes
executable but remains pending human browser acceptance; H041 records the pure
contract's automated acceptance.
