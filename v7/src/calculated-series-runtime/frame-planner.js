import {
  createCalculatedSeriesFrameIdentity,
  defineCalculatedSeriesProjectionFrame,
  readCalculatedSeriesDefinition,
  readCalculatedSeriesResult,
} from '../calculated-series-contract/public.js';
import { readReplayCursorProposal } from '../replay-contract/public.js';
import { digestCalculatedSeriesValue } from './canonical-digest.js';
import { failCalculatedSeriesRuntime } from './runtime-error.js';

const HOST_API = Object.freeze({ id: 'v7.host-api', version: '1.0.0' });
const SDK_CONTRACT = Object.freeze({ id: 'v7.calculated-series-sdk', version: '1.0.0' });

function safeId(prefix, digest) { return `${prefix}-${digest.slice(7, 23)}`; }

function projectedBars(paneSnapshot, replayVisibleThroughEpochMs) {
  if (!paneSnapshot || !Array.isArray(paneSnapshot.bars)) return Object.freeze([]);
  const bars = paneSnapshot.bars.map((bar) => Object.freeze({
    close: bar.close,
    displayEpochMs: bar.displayEpochMs,
  }));
  const firstFutureIndex = bars.findIndex(({ displayEpochMs }) => (
    displayEpochMs > replayVisibleThroughEpochMs
  ));
  if (firstFutureIndex === -1) return Object.freeze(bars);
  const futureTail = bars.slice(firstFutureIndex);
  if (futureTail.some(({ displayEpochMs }) => displayEpochMs <= replayVisibleThroughEpochMs)) {
    return Object.freeze(bars);
  }
  return Object.freeze(bars.slice(0, firstFutureIndex));
}

function diagnostic(error, instanceId) {
  const code = typeof error?.code === 'string'
    ? error.code : 'CALCULATED_SERIES_RUNTIME_CALCULATION_FAILED';
  const message = typeof error?.message === 'string' && error.message.length > 0
    ? error.message.slice(0, 320) : 'Calculated-series execution failed.';
  return Object.freeze({
    code,
    jsonPointer: null,
    logicalIdentity: instanceId,
    message,
    phase: 'execution',
    related: Object.freeze([]),
    severity: 'error',
  });
}

function provenance({ definition, frameWire, registration, warmupBars }) {
  return Object.freeze({
    calculationMode: 'full',
    datasetDigest: frameWire.datasetProvenance.datasetDigest,
    definitionDigest: registration.definitionDigest,
    executor: registration.executor,
    formulaDigest: registration.formulaDigest,
    inputTimelineDigest: frameWire.inputDigest,
    packageDigest: registration.packageDigest,
    parameterDigest: frameWire.effectiveParameterDigest,
    resultAncestry: Object.freeze([]),
    warmupCoverage: Object.freeze({
      providedBars: warmupBars.length,
      requestedBars: definition.inputRequirement.warmupBars,
    }),
  });
}

function nonReadyFrame({
  definition,
  eligibleTimeline,
  error,
  frameIdentity,
  frameWire,
  instanceId,
  projectionRevision,
  registration,
  warmupBars,
  state = 'error',
}) {
  return defineCalculatedSeriesProjectionFrame({
    diagnostics: state === 'pending' ? [] : [diagnostic(error, instanceId)],
    frameIdentity,
    plotGroups: [],
    projectionRevision,
    provenance: provenance({ definition, frameWire, registration, warmupBars }),
    resourceUsage: {
      actualInputBars: 0,
      admittedInputBars: 0,
      durationMs: 0,
      incrementalStateBytes: 0,
      outputBytes: 2,
      outputPoints: 0,
    },
    schemaVersion: 1,
    state,
  }, { definition: registration.definition, eligibleTimeline });
}

function projectionFromResult(result, definition, eligibleTimeline, frameIdentity, projectionRevision) {
  const wire = readCalculatedSeriesResult(result);
  const { frameIdentity: ignoredFrameIdentity, resultRevision: ignored, ...rest } = wire;
  return defineCalculatedSeriesProjectionFrame({
    ...rest, frameIdentity, projectionRevision,
  }, { definition, eligibleTimeline });
}

function projectionFromCache({ cache, frameIdentity, projectionRevision, registration, timeline }) {
  return defineCalculatedSeriesProjectionFrame({
    diagnostics: cache.diagnostics,
    frameIdentity,
    plotGroups: cache.plotGroups,
    projectionRevision,
    provenance: cache.provenance,
    resourceUsage: cache.resourceUsage,
    schemaVersion: 1,
    state: cache.state,
  }, { definition: registration.definition, eligibleTimeline: timeline });
}

async function createFramePlanIdentity({
  binding,
  cryptoPort,
  documentRevision,
  instance,
  paneSnapshot,
  parameters,
  registration,
  transactionIdentity,
}) {
  const definition = readCalculatedSeriesDefinition(registration.definition);
  const bars = projectedBars(paneSnapshot, binding.replayVisibleThroughEpochMs);
  const timeline = Object.freeze(bars.map(({ displayEpochMs }) => displayEpochMs));
  const provenanceWire = paneSnapshot?.provenance ?? Object.freeze({ unavailable: true });
  const [datasetDigest, inputDigest, parameterDigest, paneDigest] = await Promise.all([
    digestCalculatedSeriesValue(provenanceWire, cryptoPort),
    digestCalculatedSeriesValue(bars, cryptoPort),
    digestCalculatedSeriesValue(parameters, cryptoPort),
    digestCalculatedSeriesValue(paneSnapshot ?? { paneId: binding.workspacePaneId }, cryptoPort),
  ]);
  if (paneDigest !== binding.projectedPaneSnapshotDigest) {
    failCalculatedSeriesRuntime(
      'CALCULATED_SERIES_RUNTIME_PANE_DIGEST_MISMATCH',
      'Pane snapshot changed after its Chart binding was created.',
    );
  }
  const datasetRevisionDigest = await digestCalculatedSeriesValue(
    provenanceWire.datasetRevision ?? 'unavailable', cryptoPort,
  );
  const sourceDigest = await digestCalculatedSeriesValue(
    provenanceWire.providerId ?? 'unavailable', cryptoPort,
  );
  return Object.freeze({
    bars,
    definition,
    frameIdentity: createCalculatedSeriesFrameIdentity({
      datasetProvenance: {
        datasetDigest,
        datasetId: safeId('dataset', datasetDigest),
        datasetRevision: safeId('revision', datasetRevisionDigest),
        sourceId: safeId('source', sourceDigest),
      },
      definition: registration.definition,
      documentRevision,
      effectiveParameterDigest: parameterDigest,
      executor: registration.executor,
      hostApi: HOST_API,
      inputDigest,
      instanceId: instance.instanceId,
      instanceRevision: instance.instanceRevision,
      projectedPaneSnapshotDigest: paneDigest,
      replayVisibleThroughEpochMs: binding.replayVisibleThroughEpochMs,
      sdkContract: SDK_CONTRACT,
      workspacePaneId: binding.workspacePaneId,
      workspaceStateRevision: binding.workspaceStateRevision,
      workspaceTransactionIdentity: transactionIdentity,
    }),
    timeline,
  });
}

function calculateProjectionFrame({
  bars,
  binding,
  definition,
  execution,
  frameIdentity,
  instance,
  parameters,
  projectionRevision,
  registration,
  signal,
  timeline,
}) {
  try {
    if (timeline.some((time) => time > binding.replayVisibleThroughEpochMs)) {
      failCalculatedSeriesRuntime(
        'CALCULATED_SERIES_RUNTIME_FUTURE_INPUT',
        'Pane input contains a Bar later than the Replay cutoff.',
      );
    }
    const result = execution.execute({
      displayBars: bars,
      eligibleTimeline: timeline,
      frameIdentity,
      parameters,
      registration: registration.executionRegistration,
      resultRevision: projectionRevision,
      signal,
      warmupBars: Object.freeze([]),
    });
    const frame = projectionFromResult(
      result, registration.definition, timeline, frameIdentity, projectionRevision,
    );
    return Object.freeze({ cache: frame.read(), deferred: false, frame });
  } catch (error) {
    const frame = nonReadyFrame({
      definition,
      eligibleTimeline: timeline,
      error,
      frameIdentity,
      frameWire: frameIdentity.read(),
      instanceId: instance.instanceId,
      projectionRevision,
      registration,
      warmupBars: Object.freeze([]),
    });
    return Object.freeze({ cache: frame.read(), deferred: false, frame });
  }
}

/** Build one exact frame/result pair from an already accepted Pane snapshot. */
export async function planCalculatedSeriesInstanceFrame({
  binding,
  cryptoPort,
  documentRevision,
  defer = false,
  execution,
  instance,
  paneSnapshot,
  parameters,
  projectionRevision,
  registration,
  reuse = null,
  signal,
  transactionIdentity,
}) {
  const { bars, definition, frameIdentity, timeline } = await createFramePlanIdentity({
    binding,
    cryptoPort,
    documentRevision,
    instance,
    paneSnapshot,
    parameters,
    registration,
    transactionIdentity,
  });
  if (reuse !== null) {
    return Object.freeze({
      cache: reuse,
      deferred: false,
      frame: projectionFromCache({
        cache: reuse, frameIdentity, projectionRevision, registration, timeline,
      }),
    });
  }
  if (defer) {
    const frameWire = frameIdentity.read();
    const frame = nonReadyFrame({
      definition,
      eligibleTimeline: timeline,
      error: null,
      frameIdentity,
      frameWire,
      instanceId: instance.instanceId,
      projectionRevision,
      registration,
      state: 'pending',
      warmupBars: Object.freeze([]),
    });
    return Object.freeze({ cache: frame.read(), deferred: true, frame });
  }
  return calculateProjectionFrame({
    bars, binding, definition, execution, frameIdentity, instance, parameters,
    projectionRevision, registration, signal, timeline,
  });
}

export function replayCutoffForPaneSnapshot(paneSnapshot) {
  if (!paneSnapshot?.provenance?.cursorProposal) return 0;
  return readReplayCursorProposal(paneSnapshot.provenance.cursorProposal).targetEpochMs;
}
