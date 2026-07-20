import { CapabilityContractError } from './common-contract.js';
import { defineFormulaEngine } from './formula-engine.js';
import { defineIndicatorModule } from './indicator-module.js';
import { defineInstrument } from './instrument-definition.js';
import { defineMarketDataProvider } from './market-data-provider.js';
import { defineTimeframe } from './timeframe-definition.js';
import { defineTradingCalendar } from './trading-calendar.js';

const NORMALIZERS = Object.freeze({
  timeframe: defineTimeframe,
  marketData: defineMarketDataProvider,
  instrument: defineInstrument,
  calendar: defineTradingCalendar,
  indicator: defineIndicatorModule,
  formula: defineFormulaEngine,
});
const KINDS = Object.freeze(Object.keys(NORMALIZERS));

function key(kind, id) {
  return `${kind}:${id}`;
}

function requireKind(kind) {
  if (!KINDS.includes(kind)) {
    throw new CapabilityContractError('UNKNOWN_CAPABILITY_KIND', `Unknown capability kind ${kind}.`);
  }
}

function validateMarketReferences(byKey) {
  const instruments = [...byKey.values()].filter((value) => value.kind === 'instrument');
  const providers = [...byKey.values()].filter((value) => value.kind === 'marketData');
  for (const instrument of instruments) {
    if (!byKey.has(key('calendar', instrument.calendarId))) {
      throw new CapabilityContractError(
        'MISSING_CAPABILITY_REFERENCE',
        `${instrument.id} references missing calendar ${instrument.calendarId}.`,
      );
    }
    for (const providerId of instrument.providerIds) {
      const provider = byKey.get(key('marketData', providerId));
      if (!provider || !provider.instrumentIds.includes(instrument.id)) {
        throw new CapabilityContractError(
          'INCONSISTENT_PROVIDER_INSTRUMENT',
          `${instrument.id} and ${providerId} do not mutually declare support.`,
        );
      }
    }
  }
  for (const provider of providers) {
    for (const instrumentId of provider.instrumentIds) {
      const instrument = byKey.get(key('instrument', instrumentId));
      if (!instrument || !instrument.providerIds.includes(provider.id)) {
        throw new CapabilityContractError(
          'INCONSISTENT_PROVIDER_INSTRUMENT',
          `${provider.id} and ${instrumentId} do not mutually declare support.`,
        );
      }
    }
  }
}

function validateAnalysisReferences(byKey) {
  for (const definition of byKey.values()) {
    if (definition.kind === 'indicator'
      && definition.formulaEngineId !== null
      && !byKey.has(key('formula', definition.formulaEngineId))) {
      throw new CapabilityContractError(
        'MISSING_CAPABILITY_REFERENCE',
        `${definition.id} references missing formula engine ${definition.formulaEngineId}.`,
      );
    }
  }
}

/**
 * Owner: module-registry.
 * Creates one isolated immutable capability catalog after schema/reference checks.
 * Concrete ids are opaque Map keys; the catalog never branches on their values.
 */
export function createCapabilityCatalog(definitions) {
  if (!Array.isArray(definitions)) {
    throw new CapabilityContractError('INVALID_CAPABILITY_CATALOG', 'Definitions must be an array.');
  }
  const byKey = new Map();
  for (const candidate of definitions) {
    requireKind(candidate?.kind);
    const definition = NORMALIZERS[candidate.kind](candidate);
    const definitionKey = key(definition.kind, definition.id);
    if (byKey.has(definitionKey)) {
      throw new CapabilityContractError(
        'DUPLICATE_CAPABILITY',
        `Duplicate ${definition.kind} capability ${definition.id}.`,
      );
    }
    byKey.set(definitionKey, definition);
  }
  validateMarketReferences(byKey);
  validateAnalysisReferences(byKey);

  function get(kind, id) {
    requireKind(kind);
    const definition = byKey.get(key(kind, id));
    if (!definition) {
      throw new CapabilityContractError('UNDECLARED_CAPABILITY', `Missing ${kind} capability ${id}.`);
    }
    return definition;
  }

  function list(kind) {
    requireKind(kind);
    return Object.freeze(
      [...byKey.values()].filter((definition) => definition.kind === kind).sort(
        (left, right) => left.id.localeCompare(right.id),
      ),
    );
  }

  return Object.freeze({ get, list });
}
