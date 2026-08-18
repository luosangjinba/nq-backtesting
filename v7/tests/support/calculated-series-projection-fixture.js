import { createActivationGeneration } from '../../src/activation-generation/public.js';
import {
  createCalculatedSeriesFrameIdentity,
  defineCalculatedSeriesDefinition,
  defineCalculatedSeriesProjectionFrame,
  defineCalculatedSeriesWorkspaceDocument,
} from '../../src/calculated-series-contract/public.js';
import { createInitialContributionProfileRegistry } from '../../src/contribution-profile-contract/public.js';
import { createSessionId } from '../../src/session-identity/public.js';
import { createTransactionId } from '../../src/transaction-identity/public.js';
import { createWorkspaceTransactionIdentity } from '../../src/workspace-transaction-contract/public.js';
import {
  createCalculatedSeriesChartBinding,
  createCalculatedSeriesPaneSurfaceCandidate,
} from '../../src/calculated-series-chart-projection/public.js';

const fixedDigest = (character) => `sha256:${character.repeat(64)}`;
const clone = (value) => structuredClone(value);

function transactionIdentity() {
  return createWorkspaceTransactionIdentity({
    activationGeneration: createActivationGeneration(7),
    sessionId: createSessionId('session-contract-fixture'),
    transactionId: createTransactionId('transaction-contract-fixture'),
  });
}

function readyGroups(linePoints = null) {
  const groups = [{
    plotGroupId: 'price-group',
    plots: [
      { plotId: 'line-output', kind: 'line', points: linePoints ?? [
        { state: 'value', displayEpochMs: 1_000, value: 99 },
        { state: 'whitespace', displayEpochMs: 2_000 },
        { state: 'value', displayEpochMs: 3_000, value: 101 },
      ] },
      { plotId: 'area-output', kind: 'area', points: [
        { state: 'value', displayEpochMs: 1_000, value: 98 },
        { state: 'whitespace', displayEpochMs: 2_000 },
        { state: 'value', displayEpochMs: 3_000, value: 100 },
      ] },
      { plotId: 'baseline-output', kind: 'baseline', points: [
        { state: 'value', displayEpochMs: 1_000, value: 99 },
        { state: 'whitespace', displayEpochMs: 2_000 },
        { state: 'value', displayEpochMs: 3_000, value: 101 },
      ] },
      { plotId: 'band-output', kind: 'band', points: [
        { state: 'value', displayEpochMs: 1_000, lower: 95, upper: 105 },
        { state: 'value', displayEpochMs: 2_000, lower: 96, upper: 106 },
        { state: 'whitespace', displayEpochMs: 3_000 },
      ] },
    ],
  }, {
    plotGroupId: 'ratio-group',
    plots: [{ plotId: 'histogram-output', kind: 'histogram', points: [
      { state: 'value', displayEpochMs: 1_000, value: -1 },
      { state: 'whitespace', displayEpochMs: 2_000 },
      { state: 'value', displayEpochMs: 3_000, value: 1 },
    ] }],
  }];
  if (linePoints !== null) {
    const timeline = linePoints.map(({ displayEpochMs }) => displayEpochMs);
    for (const group of groups) {
      for (const plot of group.plots) {
        if (plot.plotId === 'line-output') continue;
        const existing = new Map(plot.points.map((point) => [point.displayEpochMs, point]));
        plot.points = timeline.map((displayEpochMs) => existing.get(displayEpochMs) ?? {
          displayEpochMs,
          state: 'whitespace',
        });
      }
    }
  }
  return groups;
}

function projectionWire(frameIdentity, state, projectionRevision, groups, eligibleTimeline) {
  const pointCount = groups.reduce((sum, group) => sum
    + group.plots.reduce((inner, plot) => inner + plot.points.length, 0), 0);
  return {
    schemaVersion: 1,
    frameIdentity,
    projectionRevision,
    state,
    plotGroups: groups,
    provenance: {
      calculationMode: 'full',
      datasetDigest: fixedDigest('2'),
      definitionDigest: fixedDigest('6'),
      executor: { executorId: 'host.synthetic-contract-executor', executorVersion: '1.0.0' },
      formulaDigest: fixedDigest('7'),
      inputTimelineDigest: fixedDigest('4'),
      packageDigest: fixedDigest('8'),
      parameterDigest: fixedDigest('3'),
      resultAncestry: [],
      warmupCoverage: { providedBars: 2, requestedBars: 2 },
    },
    resourceUsage: {
      admittedInputBars: eligibleTimeline.length,
      actualInputBars: eligibleTimeline.length,
      outputPoints: pointCount,
      outputBytes: new TextEncoder().encode(JSON.stringify(groups)).byteLength,
      durationMs: 0.25,
      incrementalStateBytes: 0,
    },
    diagnostics: [],
  };
}

function projectionDocument(wire, movePriceToInternal) {
  const document = clone(wire);
  const pane = document.workspacePanes[0];
  const instance = pane.resolvedInstances[0];
  if (!movePriceToInternal) return document;
  document.documentRevision += 1;
  instance.instanceRevision += 1;
  const priceIntent = clone(pane.scaleGroups.find(({ scaleGroupId }) => (
    scaleGroupId === 'scale-price'
  )).scaleIntent);
  pane.scaleGroups.push({
    axisIntent: 'auxiliary',
    order: 1,
    regionId: 'region-secondary',
    scaleGroupId: 'scale-price-secondary',
    scaleIntent: priceIntent,
  });
  const placement = instance.plotGroupPlacements.find(({ plotGroupId }) => (
    plotGroupId === 'price-group'
  ));
  placement.regionId = 'region-secondary';
  placement.order = 1;
  placement.scaleGroupId = 'scale-price-secondary';
  return document;
}

/** Build branded synthetic P1c.1 values shared by Node and real-browser H119 evidence. */
export function createCalculatedSeriesProjectionFixture({
  baseSurfaceRevision = 0,
  definitionWire,
  documentWire,
  linePoints = null,
  mode = 'workspace-stage',
  movePriceToInternal = false,
  projectionRevision = 1,
  replayVisibleThroughEpochMs = 3_000,
  state = 'ready',
  targetSurfaceRevision = baseSurfaceRevision + 1,
} = {}) {
  const definitionValue = clone(definitionWire);
  definitionValue.plotGroups[0].plots.find(({ kind }) => kind === 'baseline').visibleByDefault = true;
  const registry = createInitialContributionProfileRegistry();
  const definition = defineCalculatedSeriesDefinition(definitionValue, { profileRegistry: registry });
  const projectedDocument = projectionDocument(documentWire, movePriceToInternal);
  const document = defineCalculatedSeriesWorkspaceDocument(projectedDocument, { definitions: [definition] });
  const transaction = transactionIdentity();
  const instance = projectedDocument.workspacePanes[0].resolvedInstances[0];
  const frameIdentity = createCalculatedSeriesFrameIdentity({
    datasetProvenance: {
      datasetDigest: fixedDigest('2'),
      datasetId: 'dataset-contract-fixture',
      datasetRevision: 'dataset-revision-4',
      sourceId: 'source-contract-fixture',
    },
    definition,
    documentRevision: projectedDocument.documentRevision,
    effectiveParameterDigest: fixedDigest('3'),
    executor: { executorId: 'host.synthetic-contract-executor', executorVersion: '1.0.0' },
    hostApi: { id: 'host.calculated-series-api', version: '1.0.0' },
    inputDigest: fixedDigest('4'),
    instanceId: instance.instanceId,
    instanceRevision: instance.instanceRevision,
    projectedPaneSnapshotDigest: fixedDigest('5'),
    replayVisibleThroughEpochMs,
    sdkContract: { id: 'sdk.calculated-series-contract', version: '1.0.0' },
    workspacePaneId: projectedDocument.workspacePanes[0].workspacePaneId,
    workspaceStateRevision: 9,
    workspaceTransactionIdentity: transaction,
  });
  const groups = state === 'ready' ? readyGroups(linePoints) : [];
  const eligibleTimeline = state === 'empty' ? [] : [...new Set(groups.flatMap(({ plots }) => (
    plots.flatMap(({ points }) => points.map(({ displayEpochMs }) => displayEpochMs))
  )))].sort((left, right) => left - right);
  const frame = defineCalculatedSeriesProjectionFrame(
    projectionWire(frameIdentity, state, projectionRevision, groups, eligibleTimeline), {
      definition,
      eligibleTimeline,
    },
  );
  const binding = createCalculatedSeriesChartBinding({
    acceptedChartRevision: 1,
    projectedPaneSnapshotDigest: fixedDigest('5'),
    replayVisibleThroughEpochMs,
    workspacePaneId: projectedDocument.workspacePanes[0].workspacePaneId,
    workspaceStateRevision: 9,
    workspaceTransactionIdentity: transaction,
  });
  const candidate = createCalculatedSeriesPaneSurfaceCandidate({
    baseSurfaceRevision,
    chartBinding: binding,
    definitions: [definition],
    mode,
    projectionFrames: [frame],
    targetSurfaceRevision,
    workspaceDocument: document,
  });
  return Object.freeze({ binding, candidate, definition, document, frame });
}
