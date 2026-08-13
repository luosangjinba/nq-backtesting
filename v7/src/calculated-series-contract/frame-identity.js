import { serializeActivationGeneration } from '../activation-generation/public.js';
import { serializeSessionId } from '../session-identity/public.js';
import { serializeTransactionId } from '../transaction-identity/public.js';
import { readWorkspaceTransactionIdentity } from '../workspace-transaction-contract/public.js';
import { failCalculatedSeries } from './contract-error.js';
import {
  calculatedSeriesDefinitionRef,
  readCalculatedSeriesDefinition,
} from './definition.js';
import {
  digest,
  exactRecord,
  opaqueId,
  safeInteger,
  semver,
} from './portable-value.js';

class CalculatedSeriesFrameIdentityValue {
  #wire;
  constructor(wire) { this.#wire = wire; Object.freeze(this); }
  read() { return this.#wire; }
}

function serializeWorkspaceTransaction(identity) {
  const parts = readWorkspaceTransactionIdentity(identity);
  return Object.freeze({
    activationGeneration: serializeActivationGeneration(parts.activationGeneration),
    sessionId: serializeSessionId(parts.sessionId),
    transactionId: serializeTransactionId(parts.transactionId),
  });
}

function normalizeDataset(value) {
  exactRecord(value, ['datasetDigest', 'datasetId', 'datasetRevision', 'sourceId'],
    'CALCULATED_SERIES_FRAME_IDENTITY_INVALID', 'Dataset provenance');
  return Object.freeze({
    datasetDigest: digest(value.datasetDigest, 'Dataset digest'),
    datasetId: opaqueId(value.datasetId, 'Dataset id'),
    datasetRevision: opaqueId(value.datasetRevision, 'Dataset revision'),
    sourceId: opaqueId(value.sourceId, 'Dataset source id'),
  });
}

function normalizeExecutor(value) {
  exactRecord(value, ['executorId', 'executorVersion'],
    'CALCULATED_SERIES_FRAME_IDENTITY_INVALID', 'Executor identity');
  return Object.freeze({
    executorId: opaqueId(value.executorId, 'Executor id'),
    executorVersion: semver(value.executorVersion, 'Executor version'),
  });
}

function normalizeApiIdentity(value, label) {
  exactRecord(value, ['id', 'version'], 'CALCULATED_SERIES_FRAME_IDENTITY_INVALID', label);
  return Object.freeze({ id: opaqueId(value.id, `${label} id`), version: semver(value.version, `${label} version`) });
}

/** Create the exact host-owned identity to which a future calculation result must close. */
export function createCalculatedSeriesFrameIdentity(value = {}) {
  exactRecord(value, [
    'datasetProvenance', 'definition', 'documentRevision', 'effectiveParameterDigest',
    'executor', 'hostApi', 'inputDigest', 'instanceId', 'instanceRevision',
    'projectedPaneSnapshotDigest', 'replayVisibleThroughEpochMs', 'sdkContract',
    'workspacePaneId', 'workspaceStateRevision', 'workspaceTransactionIdentity',
  ], 'CALCULATED_SERIES_FRAME_IDENTITY_INVALID', 'Calculated-series frame identity input');
  readCalculatedSeriesDefinition(value.definition);
  const wire = Object.freeze({
    datasetProvenance: normalizeDataset(value.datasetProvenance),
    definitionRef: calculatedSeriesDefinitionRef(value.definition),
    documentRevision: safeInteger(value.documentRevision, 'Document revision', { minimum: 1 }),
    effectiveParameterDigest: digest(value.effectiveParameterDigest, 'Effective-parameter digest'),
    executor: normalizeExecutor(value.executor),
    hostApi: normalizeApiIdentity(value.hostApi, 'Host API'),
    inputDigest: digest(value.inputDigest, 'Input digest'),
    instanceId: opaqueId(value.instanceId, 'Instance id'),
    instanceRevision: safeInteger(value.instanceRevision, 'Instance revision', { minimum: 1 }),
    projectedPaneSnapshotDigest: digest(value.projectedPaneSnapshotDigest, 'Projected Pane snapshot digest'),
    replayVisibleThroughEpochMs: safeInteger(value.replayVisibleThroughEpochMs, 'Replay visible-through cutoff'),
    sdkContract: normalizeApiIdentity(value.sdkContract, 'SDK Contract'),
    workspacePaneId: opaqueId(value.workspacePaneId, 'Workspace Pane id'),
    workspaceStateRevision: safeInteger(value.workspaceStateRevision, 'Workspace State revision', { minimum: 1 }),
    workspaceTransaction: serializeWorkspaceTransaction(value.workspaceTransactionIdentity),
  });
  return new CalculatedSeriesFrameIdentityValue(wire);
}

/** Read a branded frame identity as exact immutable portable evidence. */
export function readCalculatedSeriesFrameIdentity(candidate) {
  if (!(candidate instanceof CalculatedSeriesFrameIdentityValue)) {
    failCalculatedSeries('CALCULATED_SERIES_FRAME_IDENTITY_REQUIRED', 'A branded calculated-series frame identity is required.');
  }
  return candidate.read();
}

/** Compare every field of two branded calculated-series frame identities. */
export function calculatedSeriesFrameIdentitiesEqual(left, right) {
  return JSON.stringify(readCalculatedSeriesFrameIdentity(left))
    === JSON.stringify(readCalculatedSeriesFrameIdentity(right));
}

/** Decide whether an output identity is current without allowing any side effect. */
export function assessCalculatedSeriesFrameCurrency({ candidate, current }) {
  const isCurrent = calculatedSeriesFrameIdentitiesEqual(candidate, current);
  return Object.freeze({
    allowedSideEffects: Object.freeze(isCurrent ? ['publish'] : []),
    code: isCurrent ? 'CALCULATED_SERIES_FRAME_CURRENT' : 'CALCULATED_SERIES_FRAME_STALE',
    status: isCurrent ? 'current' : 'stale',
  });
}
