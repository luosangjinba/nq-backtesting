# V4 Market Segment System Design

## Goal

The PDA layer marks the map. The market segment layer records the path.

Phase 6 adds explicit 1H market segments that connect swing highs and swing lows, then records how price moved between them and how it interacted with PDA. This is the bridge between PDA drawing and replay-based opportunity review.

## Scope

### In Scope
- Manual 1H segment creation from a start bar to an end bar.
- Visible segment rendering on the chart.
- Segment data model that can later hold PDA responses and narrative notes.
- Independent segment store, renderer, and manual workflow modules.

### Not Yet In Scope
- Automatic swing high / swing low detection.
- Automatic PDA response classification.
- Inspector editing for segments.
- Segment persistence or export.
- 09:30 / 09:50 / 10:00-11:00 opportunity review objects.
- Red folder news integration.

## Concepts

### PDA Annotation
A PDA is a price delivery area or liquidity point. It answers: where is important structure?

### Market Segment
A market segment is a directional move between two 1H swing points. It answers: how did price travel through the map?

### Opportunity Review
An opportunity review studies a time-window model in replay mode. It should eventually reference PDA annotations and market segments.

## Segment Schema V1

```js
{
  id,
  instrument: 'NQ',
  timeframe: '1H',
  source: 'manual',
  direction: 'up' | 'down' | 'flat',
  start: {
    time,
    timestamp,
    price,
    kind: 'swing-low' | 'swing-high'
  },
  end: {
    time,
    timestamp,
    price,
    kind: 'swing-low' | 'swing-high'
  },
  pdaResponses: [
    {
      pdaId,
      relation: 'respected' | 'swept' | 'approached' | 'rejected' | 'delivered-through',
      note
    }
  ],
  narrative: '',
  tags: [],
  display: {
    showLabel: true
  },
  createdAt,
  updatedAt
}
```

## Minimal Workflow

1. Load chart on `1H`.
2. Right-click a swing bar and choose `Start 1H Segment`.
3. Right-click the destination swing bar and choose `End 1H Segment`.
4. The system draws an explicit line with start/end markers and a direction label.
5. The segment stays independent from PDA annotations until linking is implemented.

## Module Plan

- `v4/src/segment/segment-store.js`: in-memory market segment store.
- `v4/src/segment/manual-segment.js`: right-click start/end workflow.
- `v4/src/segment/segment-renderer.js`: chart rendering.
- `v4/src/chart/primitives.js`: shared `SegmentPrimitive`.

## Next Steps

1. Add localStorage draft persistence.
2. Extend archive export to include `pdaAnnotations` and `marketSegments`.
3. Build opportunity review objects for 2022-only 09:30 Judas Swing / OTE / Purge & OB research.
