import { isEpochVisibleAtReplayCursor } from '../replay-contract/public.js';
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

/**
 * Purely project one pane from validated raw source bars under one Replay proposal.
 * Eligibility and exclusive no-future filtering always precede aggregation.
 */
export function projectPaneSnapshot(value) {
  const input = createProjectionInput(value);
  const source = collectProjectionSourceBars(input);
  const eligibleBars = eligibleVisibleBars(input, source.bars);
  const projectedValues = input.aggregationPolicy.project(eligibleBars, Object.freeze({
    aggregationPolicyRevision: input.aggregationPolicy.revision,
    calendar: input.calendar,
    cursorProposal: input.cursorProposal,
    displayTimeframe: input.displayTimeframe,
    instrument: input.instrument,
    sessionHoursPolicyId: input.sessionHoursPolicy.id,
    sessionHoursPolicyRevision: input.sessionHoursPolicy.revision,
    sessionHoursMode: input.sessionHoursPolicy.mode,
    sourceResolutionId: source.sourceIdentity.sourceResolutionId,
  }));
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
