import { readReplayCursorProposal } from '../replay-contract/public.js';
import { failProjection, ProjectionDomainError } from './projection-error.js';
import { projectPaneSnapshot } from './pane-projection.js';

const COMPATIBILITY_FIELDS = Object.freeze([
  'aggregationPolicyId',
  'aggregationPolicyRevision',
  'calendarId',
  'calendarRevision',
  'calendarVersion',
  'datasetRevision',
  'displayTimeframeDurationMs',
  'displayTimeframeId',
  'displayTimeframeVersion',
  'instrumentId',
  'instrumentVersion',
  'providerId',
  'sessionHoursPolicyId',
  'sessionHoursPolicyRevision',
  'sessionHoursMode',
  'sourceResolutionId',
]);

function requireAcceptedSnapshot(value, paneId) {
  if (!value || !Object.isFrozen(value) || value.schemaVersion !== 1
    || value.paneId !== paneId || !Array.isArray(value.bars) || value.bars.length === 0
    || !value.provenance || !Object.isFrozen(value.provenance)) {
    failProjection(
      'PROJECTION_HISTORY_ACCEPTED_SNAPSHOT_INVALID',
      'History extension requires one immutable accepted pane snapshot.',
    );
  }
  return value;
}

const NON_CONTRIBUTING_PREFIX_CODES = new Set(['PROJECTION_SOURCE_EMPTY', 'PROJECTION_VISIBLE_EMPTY']);

function requireRequestKeys(value, prefixRequestKey, accepted) {
  if (!Array.isArray(value) || value.length < 2
    || value.some((key) => typeof key !== 'string' || key.length === 0)
    || value[0] !== prefixRequestKey
    || value.slice(1).some((key, index) => key !== accepted.provenance.sourceRequestKeys[index])
    || value.length !== accepted.provenance.sourceRequestKeys.length + 1) {
    failProjection(
      'PROJECTION_HISTORY_SOURCE_KEYS_INVALID',
      'History extension request keys must prepend exactly one acquired window.',
    );
  }
  return Object.freeze([...value]);
}

function inputCompatibility(value) {
  const request = value.sourceBatches[0].request;
  return Object.freeze({
    aggregationPolicyId: value.aggregationPolicy.id,
    aggregationPolicyRevision: value.aggregationPolicy.revision,
    calendarId: value.calendar.id,
    calendarRevision: value.calendar.revision,
    calendarVersion: value.calendar.version,
    datasetRevision: request.datasetRevision,
    displayTimeframeDurationMs: value.displayTimeframe.alignment.kind === 'fixed-duration'
      ? value.displayTimeframe.alignment.durationMs
      : null,
    displayTimeframeId: value.displayTimeframe.id,
    displayTimeframeVersion: value.displayTimeframe.version,
    instrumentId: value.instrument.id,
    instrumentVersion: value.instrument.version,
    providerId: request.providerId,
    sessionHoursPolicyId: value.sessionHoursPolicy.id,
    sessionHoursPolicyRevision: value.sessionHoursPolicy.revision,
    sessionHoursMode: value.sessionHoursPolicy.mode,
    sourceResolutionId: request.sourceResolutionId,
  });
}

function requireCompatibility(candidate, accepted) {
  for (const field of COMPATIBILITY_FIELDS) {
    if (candidate[field] !== accepted.provenance[field]) {
      failProjection(
        'PROJECTION_HISTORY_SNAPSHOT_MISMATCH',
        `History extension changed ${field}.`,
      );
    }
  }
}

function requireCursor(value, accepted) {
  const prefixCursor = readReplayCursorProposal(value.cursorProposal);
  const acceptedCursor = readReplayCursorProposal(accepted.provenance.cursorProposal);
  if (prefixCursor.targetEpochMs !== acceptedCursor.targetEpochMs) {
    failProjection(
      'PROJECTION_HISTORY_CURSOR_MISMATCH',
      'History extension cannot move the Replay-visible cursor.',
    );
  }
}

function preserveAcceptedTail(value, accepted, sourceRequestKeys) {
  requireCompatibility(inputCompatibility(value), accepted);
  requireCursor(value, accepted);
  const keys = requireRequestKeys(sourceRequestKeys, value.sourceBatches[0].requestKey, accepted);
  return Object.freeze({
    bars: accepted.bars,
    paneId: accepted.paneId,
    provenance: Object.freeze({
      ...accepted.provenance,
      cursorProposal: value.cursorProposal,
      sourceRequestKeys: keys,
    }),
    schemaVersion: 1,
  });
}

/** Project one new history chunk plus its boundary, then preserve the accepted tail. */
export function projectPaneHistoryExtension({ acceptedSnapshot, sourceRequestKeys, ...value }) {
  const accepted = requireAcceptedSnapshot(acceptedSnapshot, value.paneId);
  if (!Array.isArray(value.sourceBatches) || value.sourceBatches.length !== 2) {
    failProjection(
      'PROJECTION_HISTORY_BOUNDARY_REQUIRED',
      'History extension requires the acquired and oldest accepted source windows.',
    );
  }
  let prefix;
  try {
    prefix = projectPaneSnapshot(value);
  } catch (error) {
    if (error instanceof ProjectionDomainError && NON_CONTRIBUTING_PREFIX_CODES.has(error.code)) {
      return preserveAcceptedTail(value, accepted, sourceRequestKeys);
    }
    throw error;
  }
  requireCompatibility(prefix.provenance, accepted);
  requireCursor(value, accepted);
  const keys = requireRequestKeys(sourceRequestKeys, prefix.provenance.sourceRequestKeys[0], accepted);
  const replaceThroughEpochMs = prefix.bars.at(-1).startEpochMs;
  const tail = accepted.bars.filter((bar) => bar.startEpochMs > replaceThroughEpochMs);
  const bars = Object.freeze([...prefix.bars, ...tail]);
  return Object.freeze({
    bars,
    paneId: prefix.paneId,
    provenance: Object.freeze({
      ...prefix.provenance,
      sourceRequestKeys: keys,
      visibleThroughEpochMs: accepted.provenance.visibleThroughEpochMs,
    }),
    schemaVersion: 1,
  });
}
