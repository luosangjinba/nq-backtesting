import { projectCalendarBars } from './calendar-aggregation.js';
import { failCalendarTimeframe } from './calendar-timeframe-error.js';
import {
  exactRecord,
  nonEmptyString,
  positiveSafeInteger,
  requireFunction,
  requirePeriod,
  requireSessionStartMinute,
} from './validation.js';

const POLICY_FIELDS = Object.freeze([
  'alignmentPolicyId', 'id', 'isEligibleWallEpoch', 'period', 'revision',
  'rollsToNextTradingDay', 'schemaVersion', 'sessionHoursMode',
  'sessionStartMinute', 'sourceDurationMs', 'toInstantEpochMs', 'toWallEpochMs',
]);

function normalizeConfiguration(value) {
  exactRecord(value, POLICY_FIELDS, 'policy');
  if (value.schemaVersion !== 1 || typeof value.rollsToNextTradingDay !== 'boolean') {
    failCalendarTimeframe('CALENDAR_TIMEFRAME_VERSION_UNSUPPORTED', 'Policy schema or rollover is invalid.');
  }
  return Object.freeze({
    alignmentPolicyId: nonEmptyString(value.alignmentPolicyId, 'alignmentPolicyId'),
    isEligibleWallEpoch: requireFunction(value.isEligibleWallEpoch, 'isEligibleWallEpoch'),
    period: requirePeriod(value.period),
    rollsToNextTradingDay: value.rollsToNextTradingDay,
    sessionHoursMode: nonEmptyString(value.sessionHoursMode, 'sessionHoursMode'),
    sessionStartMinute: requireSessionStartMinute(value.sessionStartMinute),
    sourceDurationMs: positiveSafeInteger(value.sourceDurationMs, 'sourceDurationMs'),
    toInstantEpochMs: requireFunction(value.toInstantEpochMs, 'toInstantEpochMs'),
    toWallEpochMs: requireFunction(value.toWallEpochMs, 'toWallEpochMs'),
  });
}

function requireProjectionContext(context, configuration, id, revision) {
  const timeframe = context?.displayTimeframe;
  if (context?.aggregationPolicyRevision !== revision
    || !timeframe || timeframe.aggregationPolicyId !== id
    || timeframe.alignment?.kind !== 'calendar'
    || timeframe.alignment.policyId !== configuration.alignmentPolicyId
    || context.sessionHoursMode !== configuration.sessionHoursMode
    || !timeframe.sourceResolutionIds?.includes(context.sourceResolutionId)) {
    failCalendarTimeframe(
      'CALENDAR_TIMEFRAME_CONTEXT_MISMATCH',
      'Projection context does not match the calendar policy configuration.',
    );
  }
}

/** Create the exact frozen calendar-aligned policy port consumed by Projection Domain. */
export function createCalendarAggregationPolicy(value) {
  const configuration = normalizeConfiguration(value);
  const id = nonEmptyString(value.id, 'id');
  const revision = nonEmptyString(value.revision, 'revision');
  return Object.freeze({
    deterministic: true,
    id,
    project: (bars, context) => {
      requireProjectionContext(context, configuration, id, revision);
      return projectCalendarBars({ bars, ...configuration });
    },
    revision,
  });
}
