const cloneFreeze = (value) => Object.freeze(JSON.parse(JSON.stringify(value)));
const required = (value, field) => { const result = String(value || '').trim(); if (!result) throw new Error(`${field} is required.`); return result; };
const finite = (value, field) => { const result = Number(value); if (!Number.isFinite(result)) throw new Error(`${field} must be finite.`); return result; };

export function createProspectiveTradePlanRevision({
  createdAt, direction, entry, evidenceId, id, invalidation, observationId,
  stop, target, tradePlanId, trialId,
} = {}) {
  const normalizedDirection = required(direction, 'Trade plan direction');
  if (!['long', 'short'].includes(normalizedDirection)) throw new Error('Trade plan direction must be long or short.');
  const prices = { entry: finite(entry, 'Trade plan entry'), stop: finite(stop, 'Trade plan stop'), target: finite(target, 'Trade plan target') };
  const validGeometry = normalizedDirection === 'long'
    ? prices.stop < prices.entry && prices.entry < prices.target
    : prices.target < prices.entry && prices.entry < prices.stop;
  if (!validGeometry) throw new Error('Trade plan entry, stop, and target geometry is invalid.');
  return cloneFreeze({
    artifactType: 'tradePlanRevision', createdAt: finite(createdAt, 'Trade plan createdAt'),
    direction: normalizedDirection, ...prices, evidenceId: required(evidenceId, 'Trade plan evidenceId'),
    id: required(id, 'Trade plan revision id'), invalidation: required(invalidation, 'Trade plan invalidation'),
    observationId: required(observationId, 'Trade plan observationId'), perspective: 'prospective',
    revision: 1, revisionKind: 'prospective', schemaVersion: 1,
    tradePlanId: required(tradePlanId, 'Trade plan id'), trialId: required(trialId, 'Trade plan trialId'),
  });
}
