import { isEpochVisibleAtReplayCursor, readReplayCursorProposal } from '../replay-contract/public.js';
import { normalizeProjectedBars } from './projected-bar.js';
import { failProjection } from './projection-error.js';
import { createProjectionInput } from './projection-input.js';
import { collectProjectionSourceBars } from './source-bar-collection.js';

function eligibleVisibleBars(input, sourceBars) {
  const context = Object.freeze({
    calendar: input.calendar,
    cursorProposal: input.cursorProposal,
    instrument: input.instrument,
    sessionHoursPolicyId: input.sessionHoursPolicy.id,
    sessionHoursPolicyRevision: input.sessionHoursPolicy.revision,
    sessionHoursMode: input.sessionHoursPolicy.mode,
  });
  const bars = sourceBars.filter((bar) => {
    if (!isEpochVisibleAtReplayCursor(bar.startEpochMs, input.cursor.targetEpochMs)) return false;
    const eligible = input.sessionHoursPolicy.isEligible(bar, context);
    if (typeof eligible !== 'boolean') {
      failProjection(
        'PROJECTION_ELIGIBILITY_RESULT_INVALID',
        'Session Hours policy must return a boolean eligibility result.',
      );
    }
    return eligible;
  });
  if (bars.length === 0) {
    failProjection('PROJECTION_VISIBLE_EMPTY', 'No eligible bars exist before the Replay cursor.');
  }
  return Object.freeze(bars);
}

function provenance(input, sourceIdentity) {
  const displayTimeframeDurationMs = input.displayTimeframe.alignment.kind === 'fixed-duration'
    ? input.displayTimeframe.alignment.durationMs
    : null;
  return Object.freeze({
    aggregationPolicyId: input.aggregationPolicy.id,
    aggregationPolicyRevision: input.aggregationPolicy.revision,
    calendarId: input.calendar.id,
    calendarRevision: input.calendar.revision,
    calendarVersion: input.calendar.version,
    cursorProposal: input.cursorProposal,
    datasetRevision: sourceIdentity.datasetRevision,
    displayTimeframeId: input.displayTimeframe.id,
    displayTimeframeDurationMs,
    displayTimeframeVersion: input.displayTimeframe.version,
    instrumentId: input.instrument.id,
    instrumentVersion: input.instrument.version,
    providerId: sourceIdentity.providerId,
    sessionHoursPolicyId: input.sessionHoursPolicy.id,
    sessionHoursPolicyRevision: input.sessionHoursPolicy.revision,
    sessionHoursMode: input.sessionHoursPolicy.mode,
    sourceResolutionId: sourceIdentity.sourceResolutionId,
    sourceRequestKeys: Object.freeze(input.sourceBatches.map((batch) => batch.requestKey)),
  });
}

const ADVANCE_COMPATIBILITY_FIELDS = Object.freeze([
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

function requireAdvanceSnapshot(value, input, expected) {
  if (!value || !Object.isFrozen(value) || value.schemaVersion !== 1
    || value.paneId !== input.paneId || !Array.isArray(value.bars) || value.bars.length === 0
    || !value.provenance || !Object.isFrozen(value.provenance)) {
    failProjection(
      'PROJECTION_ADVANCE_ACCEPTED_SNAPSHOT_INVALID',
      'Replay advance requires one immutable accepted Pane snapshot.',
    );
  }
  for (const field of ADVANCE_COMPATIBILITY_FIELDS) {
    if (value.provenance[field] !== expected[field]) {
      failProjection('PROJECTION_ADVANCE_SNAPSHOT_MISMATCH', `Replay advance changed ${field}.`);
    }
  }
  const acceptedCursor = readReplayCursorProposal(value.provenance.cursorProposal);
  if (acceptedCursor.targetEpochMs >= input.cursor.targetEpochMs) {
    failProjection(
      'PROJECTION_ADVANCE_CURSOR_INVALID',
      'Replay advance requires a strictly later cursor than the accepted snapshot.',
    );
  }
  return value;
}

function projectValues(input, sourceBars) {
  return input.aggregationPolicy.project(sourceBars, Object.freeze({
    aggregationPolicyRevision: input.aggregationPolicy.revision,
    calendar: input.calendar,
    cursorProposal: input.cursorProposal,
    displayTimeframe: input.displayTimeframe,
    instrument: input.instrument,
    sessionHoursPolicyId: input.sessionHoursPolicy.id,
    sessionHoursPolicyRevision: input.sessionHoursPolicy.revision,
    sessionHoursMode: input.sessionHoursPolicy.mode,
    sourceResolutionId: input.sourceBatches[0].request.sourceResolutionId,
  }));
}

function snapshot(input, source, eligibleBars, projectedValues) {
  return Object.freeze({
    bars: normalizeProjectedBars(projectedValues, input.cursor.targetEpochMs),
    paneId: input.paneId,
    provenance: Object.freeze({
      ...provenance(input, source.sourceIdentity),
      visibleThroughEpochMs: eligibleBars.at(-1).startEpochMs,
    }),
    schemaVersion: 1,
  });
}

/**
 * Purely project one pane from validated raw source bars under one Replay proposal.
 * Eligibility and exclusive no-future filtering always precede aggregation.
 */
export function projectPaneSnapshot(value) {
  const input = createProjectionInput(value);
  const source = collectProjectionSourceBars(input);
  const eligibleBars = eligibleVisibleBars(input, source.bars);
  return snapshot(input, source, eligibleBars, projectValues(input, eligibleBars));
}

/** Recompute only the accepted tail bucket for one strictly-forward Replay step. */
export function projectPaneReplayAdvance({ acceptedSnapshot, ...value }) {
  const input = createProjectionInput(value);
  const expected = provenance(input, input.sourceBatches[0].request);
  const accepted = requireAdvanceSnapshot(acceptedSnapshot, input, expected);
  const recomputeFromEpochMs = accepted.bars.at(-1).startEpochMs;
  const source = collectProjectionSourceBars(input, { fromEpochMs: recomputeFromEpochMs });
  const eligibleBars = eligibleVisibleBars(input, source.bars);
  const tail = snapshot(input, source, eligibleBars, projectValues(input, eligibleBars));
  if (tail.bars[0].startEpochMs !== recomputeFromEpochMs) {
    failProjection(
      'PROJECTION_ADVANCE_BOUNDARY_MISMATCH',
      'Replay advance must reproduce the accepted tail bucket boundary.',
    );
  }
  return Object.freeze({
    bars: Object.freeze([...accepted.bars.slice(0, -1), ...tail.bars]),
    paneId: tail.paneId,
    provenance: tail.provenance,
    schemaVersion: 1,
  });
}
