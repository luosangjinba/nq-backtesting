import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStorageAdapter } from '../src/session-persistence/public.js';
import {
  createWorkstationSettings,
  createWorkstationSettingsRuntime,
  createColorHistoryStore,
  createPricePresentation,
  decimalPlacesForIncrement,
  deserializeWorkstationSettings,
  readWorkstationSettings,
  serializeWorkstationSettings,
  hexColorOpacityPercent,
  hexColorWithOpacity,
  normalizeHexAlphaColor,
  WorkstationSettingsError,
} from '../src/workstation-settings/public.js';
import { createMemoryWebStorage } from './support/memory-web-storage.js';

const negativeCases = JSON.parse(readFileSync(new URL(
  './fixtures/workstation-settings/negative/cases.json', import.meta.url,
), 'utf8'));
const negativeCode = (caseName) => negativeCases.find(({ case: name }) => name === caseName)?.expectedCode;
assert.equal(negativeCases.length, 5, 'all declared negative Settings cases must stay executable');

function grid(settings) {
  return readWorkstationSettings(settings).canvas.gridVisible;
}

function settingsValue({ candles = {}, gridVisible = true } = {}) {
  const defaults = readWorkstationSettings(createWorkstationSettings());
  return createWorkstationSettings({
    candles: { ...defaults.candles, ...candles },
    canvas: { gridVisible },
  });
}

function consumer(id, presentation, { failApply = false } = {}) {
  const records = new WeakMap();
  return Object.freeze({
    id,
    stage(snapshot) {
      const staged = Object.freeze({ revision: snapshot.revision });
      records.set(staged, { next: grid(snapshot.settings), previous: presentation.gridVisible });
      return staged;
    },
    apply(staged) {
      if (failApply && records.get(staged).next === false) {
        throw new Error('intentional consumer failure');
      }
      presentation.gridVisible = records.get(staged).next;
    },
    commit() {},
    rollback(staged) { presentation.gridVisible = records.get(staged).previous; },
  });
}

const defaults = createWorkstationSettings();
assert.equal(grid(defaults), true);
assert.equal(Object.isFrozen(readWorkstationSettings(defaults)), true);
assert.equal(Object.isFrozen(readWorkstationSettings(defaults).canvas), true);
assert.equal(grid(deserializeWorkstationSettings(serializeWorkstationSettings(defaults))), true);
assert.equal(serializeWorkstationSettings(defaults).version, 3);
assert.equal(normalizeHexAlphaColor('#abc'), '#aabbccff');
assert.equal(normalizeHexAlphaColor('#abcd'), '#aabbccdd');
assert.equal(hexColorWithOpacity('#089981', 50), '#08998180');
assert.equal(hexColorOpacityPercent('#08998180'), 50);
assert.equal(decimalPlacesForIncrement('0.25'), 2);
assert.equal(decimalPlacesForIncrement('0.00010'), 4);
assert.equal(createPricePresentation({ priceIncrement: '0.25', pricePrecision: 'auto' }).format(1.5), '1.50');
const customPrice = createPricePresentation({ priceIncrement: '0.25', pricePrecision: 1 });
assert.equal(customPrice.priceFormat.type, 'custom');
assert.equal(customPrice.priceFormat.minMove, 0.25,
  'manual display precision must preserve the real instrument tick size');
assert.equal(customPrice.formatSigned(1.25), '+1.3');
const migrated = deserializeWorkstationSettings({
  schema: 'v7.workstation-settings',
  value: { canvas: { gridVisible: false } },
  version: 1,
});
assert.equal(grid(migrated), false, 'R6.9i records must preserve the committed Grid choice');
assert.deepEqual(readWorkstationSettings(migrated).candles,
  readWorkstationSettings(defaults).candles,
  'R6.9i records must migrate to accepted candle defaults');
const migratedOpaqueCandles = deserializeWorkstationSettings({
  schema: 'v7.workstation-settings',
  value: {
    candles: Object.fromEntries(Object.entries(readWorkstationSettings(defaults).candles).map(
      ([field, value]) => [field, typeof value === 'string' && value.startsWith('#') ? value.slice(0, 7) : value],
    )),
    canvas: { gridVisible: true },
  },
  version: 2,
});
assert.equal(readWorkstationSettings(migratedOpaqueCandles).candles.upBodyColor, '#089981ff',
  'R6.9j six-digit candle colors must migrate to opaque hex-alpha');
assert.throws(
  () => createWorkstationSettings({
    candles: readWorkstationSettings(defaults).candles,
    canvas: { gridVisible: true, unknown: false },
  }),
  (error) => error instanceof WorkstationSettingsError
    && error.code === negativeCode('unknown-canvas-field'),
);
assert.throws(
  () => settingsValue({ candles: { pricePrecision: 16 } }),
  (error) => error instanceof WorkstationSettingsError
    && error.code === 'WORKSTATION_SETTINGS_PRICE_PRECISION_INVALID',
);
assert.throws(
  () => settingsValue({ candles: { upBodyColor: 'red' } }),
  (error) => error instanceof WorkstationSettingsError
    && error.code === 'WORKSTATION_SETTINGS_CANDLE_COLOR_INVALID',
);
assert.throws(
  () => createWorkstationSettings({
    candles: readWorkstationSettings(defaults).candles,
    canvas: { gridVisible: 'yes' },
  }),
  (error) => error instanceof WorkstationSettingsError
    && error.code === negativeCode('invalid-grid-visible'),
);
assert.throws(
  () => deserializeWorkstationSettings({
    ...serializeWorkstationSettings(defaults), version: 99,
  }),
  (error) => error instanceof WorkstationSettingsError
    && error.code === negativeCode('unsupported-version'),
);

const webStorage = createMemoryWebStorage();
const storage = createStorageAdapter(webStorage);
const colorHistory = createColorHistoryStore({ storage, limit: 3 });
assert.deepEqual(colorHistory.initialize(), []);
assert.deepEqual(colorHistory.record(['#11223380', '#abcdef', '#11223380']), [
  '#11223380', '#abcdefff',
]);
assert.deepEqual(colorHistory.record(['#000', '#11223380', '#fedcba40']), [
  '#000000ff', '#11223380', '#fedcba40',
]);
assert.deepEqual(createColorHistoryStore({ storage, limit: 3 }).initialize(), [
  '#000000ff', '#11223380', '#fedcba40',
], 'recent colors must survive reconstruction in their separate global record');
assert.equal(webStorage.keys().includes('v7.color-history:global'), true);
const runtime = createWorkstationSettingsRuntime({ storage });
assert.deepEqual(runtime.initialize(), {
  recoveryCode: null, revision: 0, settings: defaults,
});
const mounted = { gridVisible: null };
const unregister = runtime.registerConsumer(consumer('mounted-chart', mounted));
assert.equal(mounted.gridVisible, true, 'a mounted consumer must receive the current revision immediately');
const hiddenGrid = settingsValue({ gridVisible: false });
assert.equal(runtime.save(hiddenGrid).revision, 1);
assert.equal(mounted.gridVisible, false);
assert.equal(grid(runtime.snapshot().settings), false);
assert.equal(webStorage.keys().includes('v7.workstation-settings:global'), true);

const reconstructed = createWorkstationSettingsRuntime({ storage });
assert.equal(reconstructed.initialize().revision, 1);
assert.equal(grid(reconstructed.snapshot().settings), false,
  'hard reconstruction must restore the global committed value');
const futurePane = { gridVisible: null };
reconstructed.registerConsumer(consumer('future-chart', futurePane));
assert.equal(futurePane.gridVisible, false,
  'a future consumer must apply the latest committed snapshot before use');

const corruptWebStorage = createMemoryWebStorage({
  'v7.workstation-settings:global': '{broken',
});
const corrupt = createWorkstationSettingsRuntime({
  storage: createStorageAdapter(corruptWebStorage),
});
assert.equal(corrupt.initialize().recoveryCode, 'stored-record-invalid');
assert.equal(grid(corrupt.snapshot().settings), true);
assert.equal(corrupt.save(defaults).recoveryCode, null,
  'saving recovered defaults must repair the invalid record rather than short-circuit');
assert.equal(JSON.parse(corruptWebStorage.getItem('v7.workstation-settings:global')).revision, 1);

let rejectWrites = false;
const atomicWebStorage = createMemoryWebStorage();
const atomicPort = createStorageAdapter(atomicWebStorage);
const atomicRuntime = createWorkstationSettingsRuntime({
  storage: {
    read: atomicPort.read,
    remove: atomicPort.remove,
    write(key, value) {
      if (rejectWrites) throw new Error('write unavailable');
      atomicPort.write(key, value);
    },
  },
});
const atomicPresentation = { gridVisible: null };
atomicRuntime.registerConsumer(consumer('atomic-chart', atomicPresentation));
rejectWrites = true;
assert.throws(
  () => atomicRuntime.save(hiddenGrid),
  (error) => error instanceof WorkstationSettingsError
    && error.code === negativeCode('persistence-write-failure'),
);
assert.equal(atomicPresentation.gridVisible, true,
  'a persistence failure must roll back every already-applied consumer');
assert.equal(atomicRuntime.snapshot().revision, 0);

const rejectingRuntime = createWorkstationSettingsRuntime({
  storage: createStorageAdapter(createMemoryWebStorage()),
});
const stablePresentation = { gridVisible: null };
rejectingRuntime.registerConsumer(consumer('stable-chart', stablePresentation));
rejectingRuntime.registerConsumer(consumer('rejecting-chart', { gridVisible: true }, { failApply: true }));
assert.throws(
  () => rejectingRuntime.save(hiddenGrid),
  (error) => error instanceof WorkstationSettingsError
    && error.code === negativeCode('consumer-apply-failure'),
);
assert.equal(stablePresentation.gridVisible, true,
  'one consumer rejection must roll back earlier consumers and preserve authority');
assert.equal(rejectingRuntime.snapshot().revision, 0);

unregister();
unregister();
console.log('v7 Workstation Settings harness passed');
