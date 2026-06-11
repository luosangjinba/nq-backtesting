# Secondary FVG Design

Status: frozen for Phase 11 Step 130.

## Decision

Secondary chart FVG uses the existing PDA store and the existing range PDA shape with `type: 'fvg'`.

There is no separate secondary-FVG object type, layer, store, or setup reference type.

Reasoning:

- `addManualFvg()` already creates a range PDA with `startTime`, `endTime`, `topPrice`, `bottomPrice`, `ce`, and direction.
- `identifyFvg()` is chart-context independent and can run against secondary display bars.
- The primary and secondary PDA renderers already understand range PDA records.
- PDA hit-test, Inspector, Calendar, localStorage, PDA JSON, Review JSON, undo/redo, and setup-link paths already operate on shared PDA annotations.

## Scope

Phase 11 enables ordinary secondary FVG first.

In scope:

- right-click secondary chart and mark FVG
- create the FVG from the selected secondary bar and neighboring secondary bars
- preserve secondary source metadata
- render/select/edit/delete the same PDA from either chart
- link the secondary-created FVG to the active Order Setup as normal PDA evidence
- preserve the FVG through localStorage, PDA JSON, Review JSON, and undo/redo

Out of scope for the first rollout:

- IFVG on the secondary menu
- generic manual range PDA from the secondary chart
- a separate HTF FVG review layer
- automatic FVG detection/scanning

## Data Model

Secondary-created FVG records are normal PDA annotations:

```js
{
  id: 'manual_fvg_...',
  type: 'fvg',
  source: 'manual',
  sourceChartId: 'secondary',
  sourceChartLabel: 'Secondary',
  sourceInstrument: 'ES',
  sourceTimeframe: 60,
  sourceTimeframeLabel: '1H',
  sourceContext: 'ES 1H',
  direction: 'bullish' | 'bearish',
  anchorTime,
  canonicalTimestamp,
  timestamp,
  barTime,
  startTime,
  endTime,
  topPrice,
  bottomPrice,
  ce,
  contexts: ['ES 1H', '1H FVG'],
  fillColor,
  borderColor: 'transparent',
  midlineColor,
  textColor
}
```

Notes:

- `sourceChartId/sourceInstrument/sourceTimeframe/sourceTimeframeLabel/sourceContext` identify where the FVG was created.
- `contexts` should include the source context and the structure label so Inspector, Calendar, and setup refs can show useful source text.
- `canonicalTimestamp`, `timestamp`, and `barTime` stay anchored to the FVG anchor bar.
- `startTime` and `endTime` stay chart-time values for the start and end bars, matching the existing renderer contract.

## Creation Behavior

The secondary menu should enable only `Mark FVG` during the first implementation step.

The action should:

- use `getSecondaryChartContext()`
- resolve the clicked secondary bar
- call `identifyFvg(getDisplayBars(context), bar)`
- create nothing and show a status message if no valid three-bar FVG exists
- call the existing PDA store/history path on success

The existing primary `Mark FVG` behavior must remain unchanged.

## Rendering And Selection

Both charts render from the shared PDA store.

- Primary chart projects the range PDA through existing PDA render logic.
- Secondary chart renders the same record through the secondary PDA renderer.
- Existing range PDA hit-test should remain the selection entry point.
- Selecting the secondary-rendered FVG should open the current PDA Inspector.

## Setup Link

Linking to an Order Setup remains a normal PDA link. There is no `secondary-fvg` ref type.

The linked ref should preserve the PDA source fields:

```js
{
  type: 'pda',
  id: annotation.id,
  role: 'context',
  sourceChartId: 'secondary',
  sourceChartLabel: 'Secondary',
  sourceInstrument: 'ES',
  sourceTimeframe: 60,
  sourceTimeframeLabel: '1H',
  sourceContext: 'ES 1H'
}
```

## Validation Plan

Step 131 should harden FVG source metadata without enabling the secondary menu.

Step 132 should enable secondary `Mark FVG` and validate:

- no-FVG click shows a status error and creates no record
- valid secondary 1H FVG creates one `type='fvg'` PDA with secondary source metadata
- primary FVG creation still works

Step 133 should validate rendering, hit-test, selection, Inspector edit/delete, and locate/flash.

Step 134 should validate linking a secondary FVG to the active setup and restoring the ref metadata.

Step 135 should validate localStorage, PDA JSON, Review JSON, undo/redo, Split on/off, and Replay Bar On.
