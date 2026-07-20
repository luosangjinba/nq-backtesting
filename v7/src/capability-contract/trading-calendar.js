import { CAPABILITY_INTERNALS } from './common-contract.js';

const { normalizeBase, stringList, timeZone } = CAPABILITY_INTERNALS;

/**
 * Owner: module-registry.
 * Declares calendar revision plus registered session-hours/alignment policy ids.
 * Calendar calculations remain a later pure-domain implementation.
 */
export function defineTradingCalendar(value) {
  const base = normalizeBase(value, {
    kind: 'calendar',
    contract: 'TradingCalendar',
    specificFields: ['timeZone', 'revision', 'sessionHoursPolicyIds', 'alignmentPolicyIds'],
  });
  if (typeof value.revision !== 'string' || value.revision.length === 0) {
    CAPABILITY_INTERNALS.fail('INVALID_CAPABILITY_FIELD', `${base.id}.revision must be non-empty.`);
  }
  return Object.freeze({
    ...base,
    timeZone: timeZone(value.timeZone, 'calendar.timeZone'),
    revision: value.revision,
    sessionHoursPolicyIds: stringList(value.sessionHoursPolicyIds, 'sessionHoursPolicyIds'),
    alignmentPolicyIds: stringList(value.alignmentPolicyIds, 'alignmentPolicyIds'),
  });
}
