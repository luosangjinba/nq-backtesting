import { projectFixedDurationBars } from './fixed-duration-aggregation.js';
import { failFixedTimeframe } from './fixed-timeframe-error.js';
import { exactRecord, nonEmptyString, normalizeFixedConfiguration } from './validation.js';

function requireProjectionContext(context, configuration, id, revision) {
  if (!context || typeof context !== 'object') {
    failFixedTimeframe('FIXED_TIMEFRAME_CONTEXT_INVALID', 'Projection context must be an object.');
  }
  const timeframe = context.displayTimeframe;
  if (context.aggregationPolicyRevision !== revision
    || !timeframe || timeframe.aggregationPolicyId !== id
    || timeframe.alignment?.kind !== 'fixed-duration'
    || timeframe.alignment.durationMs !== configuration.durationMs
    || !timeframe.sourceResolutionIds?.includes(context.sourceResolutionId)) {
    failFixedTimeframe('FIXED_TIMEFRAME_CONTEXT_MISMATCH', 'Projection context does not match the policy configuration.');
  }
}

/** Create the exact frozen fixed-duration policy port consumed by Projection Domain. */
export function createFixedDurationAggregationPolicy(value) {
  exactRecord(value, ['durationMs', 'id', 'offsetMs', 'revision', 'schemaVersion', 'sourceDurationMs'], 'policy');
  if (value.schemaVersion !== 1) {
    failFixedTimeframe('FIXED_TIMEFRAME_VERSION_UNSUPPORTED', 'Policy requires schemaVersion 1.');
  }
  const configuration = normalizeFixedConfiguration(value);
  const id = nonEmptyString(value.id, 'id');
  const revision = nonEmptyString(value.revision, 'revision');
  return Object.freeze({
    deterministic: true,
    id,
    project: (bars, context) => {
      requireProjectionContext(context, configuration, id, revision);
      return projectFixedDurationBars({ bars, ...configuration });
    },
    revision,
  });
}
