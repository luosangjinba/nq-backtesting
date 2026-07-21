import { readReplayCursorProposal } from '../replay-contract/public.js';
import { failProjection } from './projection-error.js';
import { projectPaneSnapshot } from './pane-projection.js';

const COMPATIBILITY_FIELDS = Object.freeze([
  'aggregationPolicyId',
  'aggregationPolicyRevision',
  'calendarId',
  'calendarRevision',
  'calendarVersion',
  'datasetRevision',
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

function requireRequestKeys(value, prefix, accepted) {
  if (!Array.isArray(value) || value.length < 2
    || value.some((key) => typeof key !== 'string' || key.length === 0)
    || value[0] !== prefix.provenance.sourceRequestKeys[0]
    || value.slice(1).some((key, index) => key !== accepted.provenance.sourceRequestKeys[index])
    || value.length !== accepted.provenance.sourceRequestKeys.length + 1) {
    failProjection(
      'PROJECTION_HISTORY_SOURCE_KEYS_INVALID',
      'History extension request keys must prepend exactly one acquired window.',
    );
  }
  return Object.freeze([...value]);
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
  const prefix = projectPaneSnapshot(value);
  for (const field of COMPATIBILITY_FIELDS) {
    if (prefix.provenance[field] !== accepted.provenance[field]) {
      failProjection(
        'PROJECTION_HISTORY_SNAPSHOT_MISMATCH',
        `History extension changed ${field}.`,
      );
    }
  }
  const prefixCursor = readReplayCursorProposal(prefix.provenance.cursorProposal);
  const acceptedCursor = readReplayCursorProposal(accepted.provenance.cursorProposal);
  if (prefixCursor.targetEpochMs !== acceptedCursor.targetEpochMs) {
    failProjection(
      'PROJECTION_HISTORY_CURSOR_MISMATCH',
      'History extension cannot move the Replay-visible cursor.',
    );
  }
  const keys = requireRequestKeys(sourceRequestKeys, prefix, accepted);
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
