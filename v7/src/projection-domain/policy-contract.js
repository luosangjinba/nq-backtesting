import { failProjection } from './projection-error.js';

function requireExactFrozenPolicy(candidate, method, code) {
  if (!candidate || typeof candidate !== 'object' || !Object.isFrozen(candidate)) {
    failProjection(code, 'Projection policy must be a frozen object.');
  }
  const fields = Object.keys(candidate).sort();
  const expectedFields = ['deterministic', 'id', method, 'revision'].sort().join(',');
  if (fields.join(',') !== expectedFields || typeof candidate[method] !== 'function') {
    failProjection(code, `Projection policy has an invalid ${method}() contract.`);
  }
  if (candidate.deterministic !== true
    || typeof candidate.revision !== 'string'
    || candidate.revision.length === 0
    || candidate.revision.trim() !== candidate.revision) {
    failProjection(code, 'Projection policy must declare deterministic true and an exact revision.');
  }
  return candidate;
}

export function requireAggregationPolicy(candidate, expectedId) {
  const policy = requireExactFrozenPolicy(
    candidate,
    'project',
    'PROJECTION_AGGREGATION_POLICY_INVALID',
  );
  if (policy.id !== expectedId) {
    failProjection(
      'PROJECTION_AGGREGATION_POLICY_MISMATCH',
      'Aggregation policy does not match the selected TimeframeDefinition.',
    );
  }
  return policy;
}

export function requireSessionHoursPolicy(candidate, calendar) {
  const policy = requireExactFrozenPolicy(
    candidate,
    'isEligible',
    'PROJECTION_SESSION_HOURS_POLICY_INVALID',
  );
  if (!calendar.sessionHoursPolicyIds.includes(policy.id)) {
    failProjection(
      'PROJECTION_SESSION_HOURS_POLICY_MISMATCH',
      'Session Hours policy is not registered by the selected TradingCalendar.',
    );
  }
  return policy;
}
