import {
  defineSemanticConstruction,
  type SemanticConstructionInputV1,
  type SemanticConstructionOutputV1,
} from '@replay-lab/v7-plugin-sdk';

function construct(input: SemanticConstructionInputV1): SemanticConstructionOutputV1 {
  const preceding = input.evidence.bars[0];
  const selected = input.evidence.bars[1];
  const confirming = input.evidence.bars[2];
  if (preceding === undefined || selected === undefined || confirming === undefined) {
    throw new TypeError('Strict FVG requires exact three-Bar evidence.');
  }
  const bullish = preceding.high < confirming.low;
  const bearish = preceding.low > confirming.high;
  if (bullish === bearish) throw new TypeError('Evidence does not form one strict wick gap.');
  const direction = bullish ? 'bullish' : 'bearish';
  const lowerPrice = bullish ? preceding.high : confirming.high;
  const upperPrice = bullish ? confirming.low : preceding.low;
  const midpointPrice = lowerPrice + ((upperPrice - lowerPrice) / 2);
  const fromEpochMs = preceding.startEpochMs;
  const toEpochMs = confirming.startEpochMs;
  return {
    artifact: {
      definitionId: 'imbalance.fvg.strict-three-bar-wick-gap',
      direction,
      lowerPrice,
      midpointPrice,
      observedAtReplayCutoffEpochMs: input.replay.cutoffEpochMs,
      source: {
        barStartsEpochMs: input.evidence.bars.map(({ startEpochMs }) => startEpochMs),
        datasetRevision: input.pane.datasetRevision,
        displayTimeframeId: input.pane.displayTimeframeId,
        instrumentId: input.pane.instrumentId,
        paneId: input.pane.id,
        selectedBarStartEpochMs: input.evidence.selectedBarStartEpochMs,
        sessionId: input.session.id,
        sourceResolution: input.pane.sourceResolution,
        workspaceRevision: input.workspace.revision,
      },
      typeId: 'imbalance.fvg',
      upperPrice,
    },
    projections: [
      {
        fromEpochMs,
        kind: 'rectangle',
        label: bullish ? 'Bullish FVG' : 'Bearish FVG',
        lowerPrice,
        toEpochMs,
        upperPrice,
      },
      { fromEpochMs, kind: 'segment', price: midpointPrice, toEpochMs },
    ],
    schemaVersion: 1,
  };
}

export default defineSemanticConstruction({
  contributionId: 'semantic.imbalance.fvg',
  executionModel: 'stateless-evidence-construction',
  kind: 'semantic-construction',
  packageId: 'first-party.fair-value-gap',
  run: construct,
  schemaVersion: 1,
});
