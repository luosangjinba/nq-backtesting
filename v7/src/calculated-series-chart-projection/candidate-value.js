import {
  readCalculatedSeriesDefinition,
  readCalculatedSeriesProjectionFrame,
  readCalculatedSeriesWorkspaceDocument,
} from '../calculated-series-contract/public.js';
import { serializeActivationGeneration } from '../activation-generation/public.js';
import { serializeSessionId } from '../session-identity/public.js';
import { serializeTransactionId } from '../transaction-identity/public.js';
import { readWorkspaceTransactionIdentity } from '../workspace-transaction-contract/public.js';
import { failCalculatedSeriesChartProjection } from './projection-error.js';

const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

class CalculatedSeriesChartBindingValue {
  #wire;
  constructor(wire) { this.#wire = wire; Object.freeze(this); }
  read() { return this.#wire; }
}

class CalculatedSeriesPaneSurfaceCandidateValue {
  #record;
  constructor(record) { this.#record = record; Object.freeze(this); }
  read() { return this.#record; }
}

function exactRecord(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failCalculatedSeriesChartProjection(code, `${label} fields are invalid.`);
  }
}

function safeInteger(value, label, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    failCalculatedSeriesChartProjection(
      'CALCULATED_SERIES_CHART_CANDIDATE_INVALID',
      `${label} is invalid.`,
    );
  }
  return value;
}

function opaqueId(value, label) {
  if (typeof value !== 'string' || !ID.test(value)) {
    failCalculatedSeriesChartProjection(
      'CALCULATED_SERIES_CHART_CANDIDATE_INVALID',
      `${label} is invalid.`,
    );
  }
  return value;
}

function digest(value, label) {
  if (typeof value !== 'string' || !DIGEST.test(value)) {
    failCalculatedSeriesChartProjection(
      'CALCULATED_SERIES_CHART_CANDIDATE_INVALID',
      `${label} is invalid.`,
    );
  }
  return value;
}

function transactionWire(identity) {
  let parts;
  try {
    parts = readWorkspaceTransactionIdentity(identity);
  } catch (cause) {
    failCalculatedSeriesChartProjection(
      'CALCULATED_SERIES_CHART_BINDING_INVALID',
      'Chart binding requires a branded Workspace transaction identity.',
      { cause },
    );
  }
  return Object.freeze({
    activationGeneration: serializeActivationGeneration(parts.activationGeneration),
    sessionId: serializeSessionId(parts.sessionId),
    transactionId: serializeTransactionId(parts.transactionId),
  });
}

/** Create the host-owned candle/Workspace binding required by one projection surface. */
export function createCalculatedSeriesChartBinding(value = {}) {
  exactRecord(value, [
    'acceptedChartRevision', 'projectedPaneSnapshotDigest',
    'replayVisibleThroughEpochMs', 'workspacePaneId', 'workspaceStateRevision',
    'workspaceTransactionIdentity',
  ], 'CALCULATED_SERIES_CHART_BINDING_INVALID', 'Calculated-series Chart binding');
  return new CalculatedSeriesChartBindingValue(Object.freeze({
    acceptedChartRevision: safeInteger(value.acceptedChartRevision, 'Accepted Chart revision'),
    projectedPaneSnapshotDigest: digest(
      value.projectedPaneSnapshotDigest,
      'Projected Pane snapshot digest',
    ),
    replayVisibleThroughEpochMs: safeInteger(
      value.replayVisibleThroughEpochMs,
      'Replay visible-through cutoff',
    ),
    workspacePaneId: opaqueId(value.workspacePaneId, 'Workspace Pane id'),
    workspaceStateRevision: safeInteger(
      value.workspaceStateRevision,
      'Workspace State revision',
      1,
    ),
    workspaceTransaction: transactionWire(value.workspaceTransactionIdentity),
  }));
}

/** Read one branded Chart binding without exposing a native Chart value. */
export function readCalculatedSeriesChartBinding(candidate) {
  if (!(candidate instanceof CalculatedSeriesChartBindingValue)) {
    failCalculatedSeriesChartProjection(
      'CALCULATED_SERIES_CHART_BINDING_REQUIRED',
      'A branded calculated-series Chart binding is required.',
    );
  }
  return candidate.read();
}

function readBrandedList(values, reader, label) {
  if (!Array.isArray(values)) {
    failCalculatedSeriesChartProjection(
      'CALCULATED_SERIES_CHART_CANDIDATE_INVALID',
      `${label} must be an array.`,
    );
  }
  try {
    return Object.freeze(values.map((value) => reader(value)));
  } catch (cause) {
    failCalculatedSeriesChartProjection(
      'CALCULATED_SERIES_CHART_CANDIDATE_UNBRANDED',
      `${label} must contain only branded P1c.1 values.`,
      { cause },
    );
  }
}

function definitionOrder(left, right) {
  return JSON.stringify({ ...left.identity, profile: left.profile })
    .localeCompare(JSON.stringify({ ...right.identity, profile: right.profile }));
}

function frameOrder(left, right) {
  return left.frameIdentity.instanceId.localeCompare(right.frameIdentity.instanceId);
}

/** Create one complete immutable Pane-surface candidate; partial Plot patches are impossible. */
export function createCalculatedSeriesPaneSurfaceCandidate(value = {}) {
  exactRecord(value, [
    'baseSurfaceRevision', 'chartBinding', 'definitions', 'mode',
    'projectionFrames', 'targetSurfaceRevision', 'workspaceDocument',
  ], 'CALCULATED_SERIES_CHART_CANDIDATE_INVALID', 'Pane-surface candidate');
  const baseSurfaceRevision = safeInteger(value.baseSurfaceRevision, 'Base surface revision');
  const targetSurfaceRevision = safeInteger(value.targetSurfaceRevision, 'Target surface revision', 1);
  if (targetSurfaceRevision !== baseSurfaceRevision + 1) {
    failCalculatedSeriesChartProjection(
      'CALCULATED_SERIES_CHART_REVISION_INVALID',
      'Target surface revision must advance the base revision exactly once.',
    );
  }
  if (!['workspace-stage', 'same-snapshot-settlement'].includes(value.mode)) {
    failCalculatedSeriesChartProjection(
      'CALCULATED_SERIES_CHART_MODE_INVALID',
      'Projection mode is unsupported.',
    );
  }
  let workspaceDocument;
  try {
    workspaceDocument = readCalculatedSeriesWorkspaceDocument(value.workspaceDocument);
  } catch (cause) {
    failCalculatedSeriesChartProjection(
      'CALCULATED_SERIES_CHART_CANDIDATE_UNBRANDED',
      'Workspace document must be a branded P1c.1 value.',
      { cause },
    );
  }
  const record = Object.freeze({
    baseSurfaceRevision,
    chartBinding: readCalculatedSeriesChartBinding(value.chartBinding),
    definitions: Object.freeze([...readBrandedList(
      value.definitions, readCalculatedSeriesDefinition, 'Definitions',
    )].sort(definitionOrder)),
    mode: value.mode,
    projectionFrames: Object.freeze([...readBrandedList(
      value.projectionFrames, readCalculatedSeriesProjectionFrame, 'Projection frames',
    )].sort(frameOrder)),
    targetSurfaceRevision,
    workspaceDocument,
  });
  return new CalculatedSeriesPaneSurfaceCandidateValue(record);
}

/** Read portable candidate evidence while preserving the private candidate brand. */
export function readCalculatedSeriesPaneSurfaceCandidate(candidate) {
  if (!(candidate instanceof CalculatedSeriesPaneSurfaceCandidateValue)) {
    failCalculatedSeriesChartProjection(
      'CALCULATED_SERIES_CHART_CANDIDATE_REQUIRED',
      'A branded complete Pane-surface candidate is required.',
    );
  }
  return candidate.read();
}

export function canonicalProjectionValue(value) {
  if (Array.isArray(value)) return value.map(canonicalProjectionValue);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalProjectionValue(value[key])]),
  );
  return Object.is(value, -0) ? 0 : value;
}
