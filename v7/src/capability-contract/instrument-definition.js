import { CAPABILITY_INTERNALS } from './common-contract.js';

const { capabilityId, normalizeBase, positiveDecimal, stringList, timeZone } = CAPABILITY_INTERNALS;

/**
 * Owner: module-registry.
 * Defines instrument identity, exact decimal increments, calendar, and providers.
 * Decimal strings avoid binary-float precision loss in future execution modules.
 */
export function defineInstrument(value) {
  const base = normalizeBase(value, {
    kind: 'instrument',
    contract: 'InstrumentDefinition',
    specificFields: [
      'symbol',
      'priceIncrement',
      'quantityIncrement',
      'exchangeTimeZone',
      'calendarId',
      'providerIds',
    ],
  });
  if (typeof value.symbol !== 'string' || value.symbol.length === 0) {
    CAPABILITY_INTERNALS.fail('INVALID_CAPABILITY_FIELD', `${base.id}.symbol must be non-empty.`);
  }
  return Object.freeze({
    ...base,
    symbol: value.symbol,
    priceIncrement: positiveDecimal(value.priceIncrement, 'priceIncrement'),
    quantityIncrement: positiveDecimal(value.quantityIncrement, 'quantityIncrement'),
    exchangeTimeZone: timeZone(value.exchangeTimeZone, 'exchangeTimeZone'),
    calendarId: capabilityId(value.calendarId, 'calendarId'),
    providerIds: stringList(value.providerIds, 'providerIds'),
  });
}
