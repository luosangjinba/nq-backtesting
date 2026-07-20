import { CAPABILITY_INTERNALS } from './common-contract.js';

const { assertExactFields, capabilityId, fail, normalizeBase, positiveSafeInteger, stringList } = CAPABILITY_INTERNALS;

/**
 * Owner: module-registry.
 * Defines a generic fixed-duration or registered calendar-aligned timeframe.
 * It contains no bars, aggregation implementation, provider access, or UI.
 */
export function defineTimeframe(value) {
  const base = normalizeBase(value, {
    kind: 'timeframe',
    contract: 'TimeframeDefinition',
    specificFields: ['alignment', 'aggregationPolicyId', 'sourceResolutionIds'],
  });
  const alignment = value.alignment;
  if (alignment?.kind === 'fixed-duration') {
    assertExactFields(alignment, ['kind', 'durationMs']);
  } else if (alignment?.kind === 'calendar') {
    assertExactFields(alignment, ['kind', 'policyId']);
  } else {
    fail('INVALID_TIMEFRAME_ALIGNMENT', `${base.id} has an invalid alignment kind.`);
  }
  const normalizedAlignment = alignment.kind === 'fixed-duration'
    ? Object.freeze({ kind: alignment.kind, durationMs: positiveSafeInteger(alignment.durationMs, 'durationMs') })
    : Object.freeze({ kind: alignment.kind, policyId: capabilityId(alignment.policyId, 'alignment.policyId') });
  return Object.freeze({
    ...base,
    alignment: normalizedAlignment,
    aggregationPolicyId: capabilityId(value.aggregationPolicyId, 'aggregationPolicyId'),
    sourceResolutionIds: stringList(value.sourceResolutionIds, 'sourceResolutionIds'),
  });
}
