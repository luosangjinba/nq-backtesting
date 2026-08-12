import {
  defineSemanticConstruction,
  type SemanticConstructionInputV1,
  type SemanticConstructionOutputV1,
} from '@replay-lab/v7-plugin-sdk';

function probe(input: SemanticConstructionInputV1): SemanticConstructionOutputV1 {
  const preceding = input.evidence.bars[0];
  const confirming = input.evidence.bars[2];
  if (preceding === undefined || confirming === undefined || preceding.high >= confirming.low) {
    throw new TypeError('Synthetic lifecycle probe requires one bullish fixture gap.');
  }
  const lowerPrice = preceding.high;
  const upperPrice = confirming.low;
  const midpointPrice = lowerPrice + ((upperPrice - lowerPrice) / 2);
  return {
    artifact: {
      definitionId: 'imbalance.fvg.strict-three-bar-wick-gap',
      direction: 'bullish',
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
        fromEpochMs: preceding.startEpochMs,
        kind: 'rectangle',
        label: 'Bullish FVG',
        lowerPrice,
        toEpochMs: confirming.startEpochMs,
        upperPrice,
      },
      {
        fromEpochMs: preceding.startEpochMs,
        kind: 'segment',
        price: midpointPrice,
        toEpochMs: confirming.startEpochMs,
      },
    ],
    schemaVersion: 1,
  };
}

export default defineSemanticConstruction({
  contributionId: 'fixture.lifecycle-proof',
  executionModel: 'stateless-evidence-construction',
  kind: 'semantic-construction',
  packageId: 'community.lifecycle-proof',
  run: probe,
  schemaVersion: 1,
});
