import {
  readCalculatedSeriesWorkspaceDocument,
} from '../calculated-series-contract/public.js';
import {
  createCalculatedSeriesChartBinding,
  createCalculatedSeriesPaneSurfaceCandidate,
} from '../calculated-series-chart-projection/public.js';
import { digestCalculatedSeriesValue } from './canonical-digest.js';
import {
  brandDocumentWire,
  cloneDocumentWire,
  paneInDocument,
} from './document-topology.js';
import {
  planCalculatedSeriesInstanceFrame,
  replayCutoffForPaneSnapshot,
} from './frame-planner.js';
import { resolveCalculatedSeriesInstanceSettings } from './settings-resolution.js';

function uniqueDefinitions(registrations) {
  return Object.freeze([...new Map(registrations.map(({ key, definition }) => (
    [key, definition]
  ))).values()]);
}

async function planVisibleFrames({
  binding,
  catalog,
  cryptoPort,
  documentRevision,
  execution,
  pane,
  paneSnapshot,
  profileSnapshot,
  reuseByInstanceId,
  signal,
  synchronousBudgetMs,
  targetSurfaceRevision,
  transactionIdentity,
}) {
  const projectionFrames = [];
  const caches = new Map();
  const calculatedInstanceIds = [];
  const deferredInstanceIds = [];
  let synchronousDurationMs = 0;
  for (const instance of pane.resolvedInstances) {
    if (instance.visibility !== 'visible') continue;
    const registration = catalog.resolve(instance.definitionRef);
    if (registration === null) continue;
    const normalized = resolveCalculatedSeriesInstanceSettings({
      instance, profileSnapshot, registration,
    });
    const reuse = reuseByInstanceId.get(instance.instanceId) ?? null;
    const planned = await planCalculatedSeriesInstanceFrame({
      binding,
      cryptoPort,
      documentRevision,
      defer: reuse === null && synchronousDurationMs >= synchronousBudgetMs,
      execution,
      instance,
      paneSnapshot,
      parameters: normalized.parameters,
      projectionRevision: targetSurfaceRevision,
      registration,
      reuse,
      signal,
      transactionIdentity,
    });
    projectionFrames.push(planned.frame);
    caches.set(instance.instanceId, planned.cache);
    if (planned.deferred) deferredInstanceIds.push(instance.instanceId);
    else if (reuse === null) {
      calculatedInstanceIds.push(instance.instanceId);
      synchronousDurationMs += planned.cache.resourceUsage.durationMs;
    }
  }
  return Object.freeze({
    caches,
    calculatedInstanceIds: Object.freeze(calculatedInstanceIds),
    deferredInstanceIds: Object.freeze(deferredInstanceIds),
    projectionFrames: Object.freeze(projectionFrames),
  });
}

/** Build one complete P1c.2 Pane surface from runtime state and exact Pane truth. */
export async function createRuntimePaneSurfaceCandidate({
  acceptedChartRevision,
  baseSurfaceRevision,
  catalog,
  cryptoPort,
  document,
  execution,
  mode,
  paneSnapshot,
  profileSnapshot,
  reuseByInstanceId = new Map(),
  signal,
  synchronousBudgetMs = 8,
  targetSurfaceRevision,
  transactionIdentity,
  workspacePaneId,
  workspaceStateRevision,
}) {
  const wire = cloneDocumentWire(document);
  const pane = paneInDocument(wire, workspacePaneId);
  if (pane === null) return null;
  const workspaceDocument = brandDocumentWire(wire, catalog.definitions);
  const projectedPaneSnapshotDigest = await digestCalculatedSeriesValue(
    paneSnapshot ?? { paneId: workspacePaneId }, cryptoPort,
  );
  const replayVisibleThroughEpochMs = replayCutoffForPaneSnapshot(paneSnapshot);
  const chartBinding = createCalculatedSeriesChartBinding({
    acceptedChartRevision,
    projectedPaneSnapshotDigest,
    replayVisibleThroughEpochMs,
    workspacePaneId,
    workspaceStateRevision,
    workspaceTransactionIdentity: transactionIdentity,
  });
  const registrations = pane.resolvedInstances.map((instance) => (
    catalog.resolve(instance.definitionRef)
  )).filter(Boolean);
  const frames = await planVisibleFrames({
    binding: chartBinding.read(),
    catalog,
    cryptoPort,
    documentRevision: readCalculatedSeriesWorkspaceDocument(workspaceDocument).documentRevision,
    execution,
    pane,
    paneSnapshot,
    profileSnapshot,
    reuseByInstanceId,
    signal,
    synchronousBudgetMs,
    targetSurfaceRevision,
    transactionIdentity,
  });
  const candidate = createCalculatedSeriesPaneSurfaceCandidate({
    baseSurfaceRevision,
    chartBinding,
    definitions: uniqueDefinitions(registrations),
    mode,
    projectionFrames: frames.projectionFrames,
    targetSurfaceRevision,
    workspaceDocument,
  });
  return Object.freeze({
    binding: chartBinding.read(),
    caches: frames.caches,
    calculatedInstanceIds: frames.calculatedInstanceIds,
    candidate,
    deferredInstanceIds: frames.deferredInstanceIds,
    paneSnapshot,
    workspaceDocument,
  });
}
