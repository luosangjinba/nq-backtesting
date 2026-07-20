import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as capabilityApi from '../src/capability-contract/public.js';
import { createModuleHost } from '../src/module-host/public.js';
import { findConcreteCapabilityIdBranches } from './support/capability-source-validator.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const negativeCases = JSON.parse(fs.readFileSync(
  path.join(TEST_DIR, 'fixtures/capability-contract/negative/cases.json'),
  'utf8',
));

function base(kind, contract, id) {
  return {
    schemaVersion: 1,
    apiVersion: 1,
    kind,
    contract,
    id,
    version: '1.0.0',
    display: { label: id, shortLabel: id },
  };
}

const IDS = Object.freeze({
  timeframe: 'demo.timeframe',
  resolution: 'demo.resolution',
  aggregation: 'demo.aggregation',
  provider: 'demo.provider',
  instrument: 'demo.instrument',
  calendar: 'demo.calendar',
  sessionHours: 'demo.session-hours',
  alignment: 'demo.alignment',
  indicator: 'demo.indicator',
  formula: 'demo.formula',
});

function calendar(overrides = {}) {
  return {
    ...base('calendar', 'TradingCalendar', IDS.calendar),
    timeZone: 'America/New_York',
    revision: 'demo-revision',
    sessionHoursPolicyIds: [IDS.sessionHours],
    alignmentPolicyIds: [IDS.alignment],
    ...overrides,
  };
}

function instrument(overrides = {}) {
  return {
    ...base('instrument', 'InstrumentDefinition', IDS.instrument),
    symbol: 'DEMO',
    priceIncrement: '0.25',
    quantityIncrement: '1',
    exchangeTimeZone: 'America/New_York',
    calendarId: IDS.calendar,
    providerIds: [IDS.provider],
    ...overrides,
  };
}

function provider(overrides = {}) {
  return {
    ...base('marketData', 'MarketDataProvider', IDS.provider),
    instrumentIds: [IDS.instrument],
    sourceResolutionIds: [IDS.resolution],
    coverage: { kind: 'dynamic' },
    timestampPrecision: 'millisecond',
    executionPrecision: 'bar',
    requestLimits: { maxBarsPerRequest: 5000, maxConcurrentRequests: 4 },
    ...overrides,
  };
}

function timeframe(overrides = {}) {
  return {
    ...base('timeframe', 'TimeframeDefinition', IDS.timeframe),
    alignment: { kind: 'fixed-duration', durationMs: 17000 },
    aggregationPolicyId: IDS.aggregation,
    sourceResolutionIds: [IDS.resolution],
    ...overrides,
  };
}

function formula(overrides = {}) {
  return {
    ...base('formula', 'FormulaEngine', IDS.formula),
    syntaxVersion: '1.0.0',
    inputKind: 'immutable-pane-bars',
    outputKinds: ['declarative-series'],
    sandboxed: true,
    deterministic: true,
    ...overrides,
  };
}

function indicator(overrides = {}) {
  return {
    ...base('indicator', 'IndicatorModule', IDS.indicator),
    inputKind: 'immutable-pane-bars',
    outputKinds: ['declarative-overlay'],
    parameterSchemaVersion: 1,
    deterministic: true,
    noFuture: true,
    formulaEngineId: IDS.formula,
    ...overrides,
  };
}

function completeDefinitions(overrides = {}) {
  return [
    calendar(overrides.calendar),
    instrument(overrides.instrument),
    provider(overrides.provider),
    timeframe(overrides.timeframe),
    formula(overrides.formula),
    indicator(overrides.indicator),
  ];
}

function selection(overrides = {}) {
  return {
    timeframeId: IDS.timeframe,
    providerId: IDS.provider,
    instrumentId: IDS.instrument,
    indicatorIds: [IDS.indicator],
    ...overrides,
  };
}

function assertDeepFrozen(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeepFrozen(child, seen);
}

const moduleDescriptor = JSON.parse(fs.readFileSync(
  path.join(V7_ROOT, 'src/capability-contract/module.json'),
  'utf8',
));
const host = createModuleHost([{ descriptor: moduleDescriptor, publicApi: capabilityApi }]);
await host.start();
const api = host.getPublicApi('core.capability-contract');
const catalog = api.createCapabilityCatalog(completeDefinitions());
const negotiated = api.negotiateCapabilitySelection({ catalog, selection: selection() });
assert.equal(negotiated.timeframe.alignment.durationMs, 17000);
assert.equal(negotiated.provider.id, IDS.provider);
assert.equal(negotiated.calendar.id, IDS.calendar);
assert.deepEqual(negotiated.formulaEngines.map((entry) => entry.id), [IDS.formula]);
assertDeepFrozen(negotiated);
await host.stop();

const foundationOnlyCatalog = api.createCapabilityCatalog(completeDefinitions().slice(0, 4));
const foundationSelection = api.negotiateCapabilitySelection({
  catalog: foundationOnlyCatalog,
  selection: selection({ indicatorIds: [] }),
});
assert.deepEqual(foundationSelection.indicators, []);
assert.deepEqual(foundationSelection.formulaEngines, []);

const alternateCatalog = api.createCapabilityCatalog(completeDefinitions({
  timeframe: {
    id: 'community.custom-timeframe',
    alignment: { kind: 'fixed-duration', durationMs: 23000 },
  },
}));
assert.equal(
  api.negotiateCapabilitySelection({
    catalog: alternateCatalog,
    selection: selection({ timeframeId: 'community.custom-timeframe' }),
  })
    .timeframe.alignment.durationMs,
  23000,
);
assert.equal(catalog.get('timeframe', IDS.timeframe).alignment.durationMs, 17000);

const capabilitySources = fs.readdirSync(path.join(V7_ROOT, 'src/capability-contract'))
  .filter((file) => file.endsWith('.js'))
  .map((file) => fs.readFileSync(path.join(V7_ROOT, 'src/capability-contract', file), 'utf8'));
assert.deepEqual(
  capabilitySources.flatMap(findConcreteCapabilityIdBranches),
  [],
  'core capability contract must not branch on concrete ids',
);

async function failureCode(action) {
  try {
    await action();
    return null;
  } catch (error) {
    assert.ok(error instanceof api.CapabilityContractError);
    return error.code;
  }
}

const negativeActions = {
  'unknown-field': () => api.defineTimeframe({ ...timeframe(), legacyMode: true }),
  'unsupported-schema': () => api.defineTimeframe({ ...timeframe(), schemaVersion: 2 }),
  'invalid-timeframe-duration': () => api.defineTimeframe({
    ...timeframe(),
    alignment: { kind: 'fixed-duration', durationMs: 0 },
  }),
  'invalid-time-zone': () => api.defineTradingCalendar(calendar({ timeZone: 'Not/A_Zone' })),
  'invalid-decimal-increment': () => api.defineInstrument(instrument({ priceIncrement: '0' })),
  'invalid-provider-limit': () => api.defineMarketDataProvider(provider({
    requestLimits: { maxBarsPerRequest: 0, maxConcurrentRequests: 4 },
  })),
  'unsafe-indicator': () => api.defineIndicatorModule(indicator({ noFuture: false })),
  'unsafe-formula': () => api.defineFormulaEngine(formula({ sandboxed: false })),
  'duplicate-capability': () => api.createCapabilityCatalog([
    ...completeDefinitions(),
    timeframe(),
  ]),
  'missing-calendar-reference': () => api.createCapabilityCatalog(completeDefinitions().slice(1)),
  'provider-instrument-mismatch': () => api.createCapabilityCatalog(completeDefinitions({
    provider: { instrumentIds: ['demo.other-instrument'] },
  })),
  'missing-formula-reference': () => api.createCapabilityCatalog(completeDefinitions().slice(0, 5).filter(
    (definition) => definition.kind !== 'formula',
  ).concat(indicator())),
  'undeclared-selection': () => api.negotiateCapabilitySelection({
    catalog,
    selection: selection({ timeframeId: 'demo.undeclared-timeframe' }),
  }),
  'incompatible-resolution': () => {
    const incompatibleCatalog = api.createCapabilityCatalog(completeDefinitions({
      timeframe: { sourceResolutionIds: ['demo.unavailable-resolution'] },
    }));
    return api.negotiateCapabilitySelection({ catalog: incompatibleCatalog, selection: selection() });
  },
  'incompatible-calendar-alignment': () => {
    const incompatibleCatalog = api.createCapabilityCatalog(completeDefinitions({
      timeframe: { alignment: { kind: 'calendar', policyId: 'demo.missing-alignment' } },
    }));
    return api.negotiateCapabilitySelection({ catalog: incompatibleCatalog, selection: selection() });
  },
  'concrete-id-branch': () => {
    const [code] = findConcreteCapabilityIdBranches(
      "if (selection.timeframeId === 'vendor.special') return specialProjection;",
    );
    return code;
  },
};

for (const fixture of negativeCases) {
  const actual = fixture.case === 'concrete-id-branch'
    ? negativeActions[fixture.case]()
    : await failureCode(negativeActions[fixture.case]);
  assert.equal(actual, fixture.expectedFailureCode, `${fixture.case} must fail as declared`);
}

console.log(`v7 capability contract harness passed (${negativeCases.length} negative controls)`);
