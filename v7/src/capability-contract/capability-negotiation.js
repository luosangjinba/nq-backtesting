import { CAPABILITY_INTERNALS, CapabilityContractError } from './common-contract.js';

function normalizeSelection(value) {
  CAPABILITY_INTERNALS.assertExactFields(
    value,
    ['timeframeId', 'providerId', 'instrumentId'],
    ['indicatorIds', 'formulaIds'],
  );
  return Object.freeze({
    timeframeId: CAPABILITY_INTERNALS.capabilityId(value.timeframeId, 'timeframeId'),
    providerId: CAPABILITY_INTERNALS.capabilityId(value.providerId, 'providerId'),
    instrumentId: CAPABILITY_INTERNALS.capabilityId(value.instrumentId, 'instrumentId'),
    indicatorIds: CAPABILITY_INTERNALS.stringList(
      value.indicatorIds ?? [],
      'indicatorIds',
      { nonEmpty: false },
    ),
    formulaIds: CAPABILITY_INTERNALS.stringList(
      value.formulaIds ?? [],
      'formulaIds',
      { nonEmpty: false },
    ),
  });
}

/**
 * Owner: module-registry.
 * Resolves one compatible provider/instrument/calendar/timeframe selection and
 * optional analysis capabilities before any product module is started.
 */
export function negotiateCapabilitySelection({ catalog, selection }) {
  if (!catalog || typeof catalog.get !== 'function' || typeof catalog.list !== 'function') {
    throw new CapabilityContractError('INVALID_CAPABILITY_CATALOG', 'A capability catalog is required.');
  }
  const requested = normalizeSelection(selection);
  const timeframe = catalog.get('timeframe', requested.timeframeId);
  const provider = catalog.get('marketData', requested.providerId);
  const instrument = catalog.get('instrument', requested.instrumentId);
  const calendar = catalog.get('calendar', instrument.calendarId);

  if (!instrument.providerIds.includes(provider.id) || !provider.instrumentIds.includes(instrument.id)) {
    throw new CapabilityContractError('INCOMPATIBLE_CAPABILITY_SELECTION', 'Provider/instrument is incompatible.');
  }
  if (timeframe.sourceResolutionIds.some((id) => !provider.sourceResolutionIds.includes(id))) {
    throw new CapabilityContractError('INCOMPATIBLE_CAPABILITY_SELECTION', 'Provider lacks timeframe resolution.');
  }
  if (timeframe.alignment.kind === 'calendar'
    && !calendar.alignmentPolicyIds.includes(timeframe.alignment.policyId)) {
    throw new CapabilityContractError('INCOMPATIBLE_CAPABILITY_SELECTION', 'Calendar lacks alignment policy.');
  }

  const indicators = requested.indicatorIds.map((id) => catalog.get('indicator', id));
  const formulaIds = new Set(requested.formulaIds);
  for (const indicator of indicators) {
    if (indicator.formulaEngineId !== null) formulaIds.add(indicator.formulaEngineId);
  }
  const formulaEngines = [...formulaIds].sort().map((id) => catalog.get('formula', id));
  return Object.freeze({
    timeframe,
    provider,
    instrument,
    calendar,
    indicators: Object.freeze(indicators),
    formulaEngines: Object.freeze(formulaEngines),
  });
}
