# Secondary Segment Design

Status: frozen for Phase 10 Step 126.

## Decision

Secondary chart segments use the existing Segment store. They are not a separate HTF structure layer.

Reasoning:

- The current Segment store already supports shared review behavior: Inspector editing, PDA responses, Composite Move membership, Calendar indexing, Review JSON import/export, localStorage, and undo/redo.
- The secondary chart already renders the same Segment store through `secondary-segment-renderer.js`.
- A separate HTF layer would duplicate selection, persistence, Calendar, Composite, and setup-link logic before the data model has stabilized.

## Data Model

Secondary-created segments are normal segment records with source metadata:

```js
{
  id: 'manual_segment_secondary_...',
  source: 'manual',
  sourceChartId: 'secondary',
  sourceChartLabel: 'Secondary',
  sourceInstrument: 'ES',
  sourceTimeframe: 60,
  sourceTimeframeLabel: '1H',
  sourceContext: 'ES 1H',
  instrument: 'ES',
  timeframe: '1H',
  direction: 'up' | 'down' | 'flat',
  start: {
    time,
    timestamp,
    price,
    kind: 'swing-low' | 'swing-high',
    barTime,
    sourceTimeframe: 60
  },
  end: {
    time,
    timestamp,
    price,
    kind: 'swing-low' | 'swing-high',
    barTime,
    sourceTimeframe: 60
  },
  pdaResponses: [],
  narrative: '',
  tags: [],
  display: { showLabel: false }
}
```

Notes:

- `instrument` and `timeframe` describe the segment itself.
- `sourceChartId/sourceInstrument/sourceTimeframe` describe where it was created.
- Start/end `sourceTimeframe` remains the timeframe of each picked endpoint.
- Occurrence lookup can stay primary/NQ-only until a later step makes it context-aware for secondary instruments. Step 127 should not block on occurrence lookup.

## Rendering

Both charts render from the same Segment store.

- Primary chart: existing `segment-renderer.js` projects endpoints to the primary timeframe through `segment-time.js`.
- Secondary chart: existing `secondary-segment-renderer.js` projects endpoints to the secondary timeframe.
- A secondary-created segment can appear on both charts if the timestamps fall inside the loaded ranges.
- Display mode, isolate state, Composite highlighting, and selected state remain shared.

## Selection And Inspector

Selection should also remain shared.

- Step 127 should extend segment hit-testing/selection to accept a chart context, matching the PDA approach from Step 123.
- Selecting a secondary-rendered segment should emit the existing `segment:selected` event.
- Inspector should render the existing Segment panel, with source metadata shown in the Market Segment section.
- Delete/edit/narrative/tags/display/PDA response actions should continue to mutate the same Segment object.

## Setup Link

Linking a secondary segment to an Order Setup should use a normal `type: 'segment'` ref with source metadata copied onto the ref:

```js
{
  type: 'segment',
  id: segment.id,
  role: 'context',
  sourceChartId: segment.sourceChartId,
  sourceChartLabel: segment.sourceChartLabel,
  sourceInstrument: segment.sourceInstrument,
  sourceTimeframe: segment.sourceTimeframe,
  sourceTimeframeLabel: segment.sourceTimeframeLabel,
  sourceContext: segment.sourceContext
}
```

There is no separate `secondary-segment` ref type.

## Calendar And Archive

No new Calendar object type is needed. Secondary-created segments stay under the existing `segment` group.

Review JSON/localStorage should preserve the source metadata because segment import/export already spreads unknown fields. Step 129 should explicitly validate this after Step 127/128 add writes.

## Step 127 Scope

Step 127 should implement only the MVP path:

- secondary context menu enables `Start Segment from Low`, `Start Segment from High`, `End Segment at Low`, and `End Segment at High`
- secondary segment creation writes the shared Segment store with source metadata
- secondary segment hit-test/select opens the existing Inspector
- existing primary 1H segment behavior must remain unchanged

Out of scope for Step 127:

- separate HTF structure layer
- FVG/range segment variants
- automatic occurrence lookup for non-NQ secondary instruments
- setup linking, which stays Step 128
