import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStorageAdapter } from '../src/session-persistence/public.js';
import {
  createWorkstationSettings,
  createWorkstationSettingsRuntime,
  createColorHistoryStore,
  createPricePresentation,
  createTimePresentation,
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
import { createViewportSettingsConsumer } from '../src/replay-workspace-ui/viewport-settings-consumer.js';
import {
  createWorkstationSettingsViewConsumer,
} from '../src/replay-workspace-ui/workstation-settings-view-consumer.js';

const negativeCases = JSON.parse(readFileSync(new URL(
  './fixtures/workstation-settings/negative/cases.json', import.meta.url,
), 'utf8'));
const negativeCode = (caseName) => negativeCases.find(({ case: name }) => name === caseName)?.expectedCode;
assert.equal(negativeCases.length, 5, 'all declared negative Settings cases must stay executable');

function grid(settings) {
  return readWorkstationSettings(settings).canvas.gridVisible;
}

function settingsValue({
  candles = {}, canvas = {}, currentPrice = {}, gridVisible = true, interface: interfaceSettings = {},
  paneReadout = {}, time = {},
} = {}) {
  const defaults = readWorkstationSettings(createWorkstationSettings());
  return createWorkstationSettings({
    candles: { ...defaults.candles, ...candles },
    canvas: { ...defaults.canvas, ...canvas, gridVisible },
    currentPrice: { ...defaults.currentPrice, ...currentPrice },
    interface: { ...defaults.interface, ...interfaceSettings },
    paneReadout: { ...defaults.paneReadout, ...paneReadout },
    time: { ...defaults.time, ...time },
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
assert.equal(Object.isFrozen(readWorkstationSettings(defaults).currentPrice), true);
assert.equal(Object.isFrozen(readWorkstationSettings(defaults).interface), true);
assert.equal(Object.isFrozen(readWorkstationSettings(defaults).paneReadout), true);
assert.equal(Object.isFrozen(readWorkstationSettings(defaults).time), true);
assert.equal(grid(deserializeWorkstationSettings(serializeWorkstationSettings(defaults))), true);
assert.equal(serializeWorkstationSettings(defaults).version, 6);
assert.deepEqual(readWorkstationSettings(defaults).canvas, {
  backgroundColor: '#000000ff',
  bottomMarginPercent: 12,
  crosshairColor: '#758696ff',
  crosshairOpacityPercent: 100,
  crosshairStyle: 'dashed',
  crosshairWidth: 1,
  gridVisible: true,
  rightMarginBars: 12,
  scaleFontSize: 12,
  scaleTextColor: '#b8bdc5ff',
  topMarginPercent: 10,
});
assert.deepEqual(readWorkstationSettings(defaults).interface, {
  paneControlDockVisibility: 'hover',
});
assert.deepEqual(readWorkstationSettings(defaults).currentPrice, {
  lineVisible: true, nameVisible: true, valueVisible: true,
});
assert.deepEqual(readWorkstationSettings(defaults).paneReadout, {
  changeVisible: true, ohlcVisible: true, volumeVisible: false,
});
assert.deepEqual(readWorkstationSettings(defaults).time, {
  dateFormat: 'MM/DD/YYYY', dayOfWeekVisible: false,
  displayTimezone: 'America/New_York', hourFormat: '24-hour',
});
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
const migratedAlphaCandles = deserializeWorkstationSettings({
  schema: 'v7.workstation-settings',
  value: {
    candles: readWorkstationSettings(defaults).candles,
    canvas: { gridVisible: false },
  },
  version: 3,
});
assert.equal(readWorkstationSettings(migratedAlphaCandles).canvas.gridVisible, false);
assert.deepEqual(readWorkstationSettings(migratedAlphaCandles).currentPrice,
  readWorkstationSettings(defaults).currentPrice,
  'R6.9j1 records must migrate to accepted current-price defaults');
assert.deepEqual(readWorkstationSettings(migratedAlphaCandles).paneReadout,
  readWorkstationSettings(defaults).paneReadout,
  'R6.9j1 records must migrate to accepted readout defaults');
const migratedStatusCurrentPrice = deserializeWorkstationSettings({
  schema: 'v7.workstation-settings',
  value: {
    candles: readWorkstationSettings(defaults).candles,
    canvas: { gridVisible: false },
    currentPrice: { lineVisible: false, nameVisible: true, valueVisible: false },
    paneReadout: { changeVisible: false, ohlcVisible: true, volumeVisible: true },
  },
  version: 4,
});
assert.equal(readWorkstationSettings(migratedStatusCurrentPrice).canvas.gridVisible, false);
assert.equal(readWorkstationSettings(migratedStatusCurrentPrice).canvas.rightMarginBars, 12);
assert.equal(readWorkstationSettings(migratedStatusCurrentPrice).currentPrice.lineVisible, false);
assert.equal(readWorkstationSettings(migratedStatusCurrentPrice).paneReadout.volumeVisible, true);
const migratedCanvasPresentation = deserializeWorkstationSettings({
  schema: 'v7.workstation-settings',
  value: {
    candles: readWorkstationSettings(defaults).candles,
    canvas: readWorkstationSettings(defaults).canvas,
    currentPrice: readWorkstationSettings(defaults).currentPrice,
    interface: readWorkstationSettings(defaults).interface,
    paneReadout: readWorkstationSettings(defaults).paneReadout,
  },
  version: 5,
});
assert.deepEqual(readWorkstationSettings(migratedCanvasPresentation).time,
  readWorkstationSettings(defaults).time,
  'R6.9l records must migrate to the accepted shared time defaults');
assert.throws(
  () => createWorkstationSettings({
    candles: readWorkstationSettings(defaults).candles,
    canvas: { ...readWorkstationSettings(defaults).canvas, unknown: false },
    currentPrice: readWorkstationSettings(defaults).currentPrice,
    interface: readWorkstationSettings(defaults).interface,
    paneReadout: readWorkstationSettings(defaults).paneReadout,
    time: readWorkstationSettings(defaults).time,
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
  () => settingsValue({ currentPrice: { nameVisible: 'yes' } }),
  (error) => error instanceof WorkstationSettingsError
    && error.code === 'WORKSTATION_SETTINGS_CURRENT_PRICE_VISIBILITY_INVALID',
);
assert.throws(
  () => settingsValue({ paneReadout: { volumeVisible: 'yes' } }),
  (error) => error instanceof WorkstationSettingsError
    && error.code === 'WORKSTATION_SETTINGS_PANE_READOUT_VISIBILITY_INVALID',
);
assert.throws(
  () => settingsValue({ canvas: { crosshairOpacityPercent: 101 } }),
  (error) => error instanceof WorkstationSettingsError
    && error.code === 'WORKSTATION_SETTINGS_CROSSHAIR_OPACITY_INVALID',
);
assert.throws(
  () => settingsValue({ canvas: { bottomMarginPercent: 50, topMarginPercent: 50 } }),
  (error) => error instanceof WorkstationSettingsError
    && error.code === 'WORKSTATION_SETTINGS_CANVAS_MARGIN_SUM_INVALID',
);
assert.throws(
  () => settingsValue({ interface: { paneControlDockVisibility: 'sometimes' } }),
  (error) => error instanceof WorkstationSettingsError
    && error.code === 'WORKSTATION_SETTINGS_PANE_CONTROL_VISIBILITY_INVALID',
);
assert.throws(
  () => createWorkstationSettings({
    candles: readWorkstationSettings(defaults).candles,
    canvas: { ...readWorkstationSettings(defaults).canvas, gridVisible: 'yes' },
    currentPrice: readWorkstationSettings(defaults).currentPrice,
    interface: readWorkstationSettings(defaults).interface,
    paneReadout: readWorkstationSettings(defaults).paneReadout,
    time: readWorkstationSettings(defaults).time,
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

const summerEpochMs = Date.parse('2026-05-01T13:30:00Z');
const winterEpochMs = Date.parse('2026-01-02T14:30:00Z');
const defaultTime = createTimePresentation(defaults, { localTimeZone: 'America/Los_Angeles' });
assert.equal(defaultTime.formatDateTime(summerEpochMs), '05/01/2026, 09:30 EDT');
assert.equal(defaultTime.formatTime(winterEpochMs), '09:30',
  'New York presentation must retain DST-aware winter behavior');
const utcTime = createTimePresentation(settingsValue({ time: {
  dateFormat: 'YYYY-MM-DD', dayOfWeekVisible: true, displayTimezone: 'UTC', hourFormat: '12-hour',
} }), { localTimeZone: 'America/Los_Angeles' });
assert.equal(utcTime.formatDateTime(summerEpochMs), 'Fri 2026-05-01, 1:30 PM UTC');
assert.equal(utcTime.formatAxisTick(summerEpochMs, 'day'), '26-05-01',
  'dense axis dates must honor date order without adding weekday text');
const localTime = createTimePresentation(settingsValue({ time: {
  dateFormat: 'DD/MM/YYYY', displayTimezone: 'local', hourFormat: '24-hour',
} }), { localTimeZone: 'America/Los_Angeles' });
assert.equal(localTime.formatDateTime(summerEpochMs), '01/05/2026, 06:30 PDT');
assert.equal(localTime.timeZone, 'America/Los_Angeles');
assert.throws(() => settingsValue({ time: { displayTimezone: 'UTC-4' } }),
  (error) => error instanceof WorkstationSettingsError
    && error.code === 'WORKSTATION_SETTINGS_DISPLAY_TIMEZONE_INVALID');
assert.equal(summerEpochMs, Date.parse('2026-05-01T13:30:00Z'),
  'time presentation must never mutate the canonical instant');

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
const previewSnapshot = runtime.preview(hiddenGrid);
assert.equal(previewSnapshot.revision, 1);
assert.equal(mounted.gridVisible, false, 'preview must apply to mounted consumers immediately');
assert.equal(runtime.snapshot().revision, 0, 'preview must not advance committed authority');
assert.equal(grid(runtime.snapshot().settings), true, 'preview must not replace committed Settings');
assert.equal(webStorage.keys().includes('v7.workstation-settings:global'), false,
  'preview must not write durable Settings');
assert.equal(runtime.cancelPreview().revision, 0);
assert.equal(mounted.gridVisible, true, 'cancel must restore the committed consumer presentation');
assert.equal(runtime.preview(hiddenGrid).revision, 1);
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
atomicRuntime.preview(hiddenGrid);
assert.equal(atomicPresentation.gridVisible, false);
assert.throws(
  () => atomicRuntime.save(hiddenGrid),
  (error) => error instanceof WorkstationSettingsError
    && error.code === negativeCode('persistence-write-failure'),
);
assert.equal(atomicPresentation.gridVisible, true,
  'a persistence failure must roll back every previewed consumer');
assert.equal(atomicRuntime.snapshot().revision, 0);

let rejectReads = false;
const readFailurePort = createStorageAdapter(createMemoryWebStorage());
const readFailureRuntime = createWorkstationSettingsRuntime({
  storage: {
    read(key) {
      if (rejectReads) throw new Error('read unavailable');
      return readFailurePort.read(key);
    },
    remove: readFailurePort.remove,
    write: readFailurePort.write,
  },
});
const readFailurePresentation = { gridVisible: null };
readFailureRuntime.registerConsumer(consumer('read-failure-chart', readFailurePresentation));
readFailureRuntime.preview(hiddenGrid);
rejectReads = true;
assert.throws(
  () => readFailureRuntime.save(hiddenGrid),
  (error) => error instanceof WorkstationSettingsError
    && error.code === 'WORKSTATION_SETTINGS_PERSISTENCE_FAILED',
);
assert.equal(readFailurePresentation.gridVisible, true,
  'a pre-write persistence-read failure must also restore the preview');
assert.equal(readFailureRuntime.snapshot().revision, 0);

const rejectingRuntime = createWorkstationSettingsRuntime({
  storage: createStorageAdapter(createMemoryWebStorage()),
});
const stablePresentation = { gridVisible: null };
rejectingRuntime.registerConsumer(consumer('stable-chart', stablePresentation));
rejectingRuntime.registerConsumer(consumer('rejecting-chart', { gridVisible: true }, { failApply: true }));
assert.throws(
  () => rejectingRuntime.preview(hiddenGrid),
  (error) => error instanceof WorkstationSettingsError
    && error.code === 'WORKSTATION_SETTINGS_PREVIEW_FAILED',
);
assert.equal(stablePresentation.gridVisible, true,
  'one preview rejection must restore every earlier preview consumer');
assert.throws(
  () => rejectingRuntime.save(hiddenGrid),
  (error) => error instanceof WorkstationSettingsError
    && error.code === negativeCode('consumer-apply-failure'),
);
assert.equal(stablePresentation.gridVisible, true,
  'one consumer rejection must roll back earlier consumers and preserve authority');
assert.equal(rejectingRuntime.snapshot().revision, 0);

const viewportSettingsRuntime = createWorkstationSettingsRuntime({
  storage: createStorageAdapter(createMemoryWebStorage()),
});
let rightMarginBars = 12;
viewportSettingsRuntime.registerConsumer(createViewportSettingsConsumer({
  viewportDefaultsPort: {
    readDefaultRightMarginBars: () => rightMarginBars,
    setDefaultRightMarginBars(value) { rightMarginBars = value; },
  },
}));
viewportSettingsRuntime.preview(settingsValue({ canvas: { rightMarginBars: 28 } }));
assert.equal(rightMarginBars, 28, 'preview must reach the Viewport-owned future/reset default');
viewportSettingsRuntime.cancelPreview();
assert.equal(rightMarginBars, 12, 'cancel must restore the committed Viewport default');
viewportSettingsRuntime.preview(settingsValue({ canvas: { rightMarginBars: 28 } }));
viewportSettingsRuntime.save(settingsValue({ canvas: { rightMarginBars: 28 } }));
assert.equal(rightMarginBars, 28,
  'the Viewport consumer must receive the committed default without chart ownership');

const viewSettingsRuntime = createWorkstationSettingsRuntime({
  storage: createStorageAdapter(createMemoryWebStorage()),
});
const viewPresentation = { gridVisible: null, revisions: [] };
viewSettingsRuntime.registerConsumer(createWorkstationSettingsViewConsumer({
  view: {
    setWorkstationSettings(snapshot) {
      viewPresentation.gridVisible = grid(snapshot.settings);
      viewPresentation.revisions.push(snapshot.revision);
    },
  },
}));
assert.equal(viewPresentation.gridVisible, true);
viewSettingsRuntime.preview(hiddenGrid);
assert.equal(viewPresentation.gridVisible, false,
  'Replay Workspace UI must participate in live preview as a formal consumer');
viewSettingsRuntime.cancelPreview();
assert.equal(viewPresentation.gridVisible, true,
  'Replay Workspace UI must restore its committed presentation on cancel');
viewSettingsRuntime.preview(hiddenGrid);
viewSettingsRuntime.save(hiddenGrid);
assert.equal(viewPresentation.gridVisible, false);
assert.deepEqual(viewPresentation.revisions, [0, 1, 0, 1],
  'UI consumer must initialize, preview, roll back, and reuse the final preview on commit');

const rollbackViewportRuntime = createWorkstationSettingsRuntime({
  storage: createStorageAdapter(createMemoryWebStorage()),
});
let rollbackRightMarginBars = 12;
rollbackViewportRuntime.registerConsumer(createViewportSettingsConsumer({
  viewportDefaultsPort: {
    readDefaultRightMarginBars: () => rollbackRightMarginBars,
    setDefaultRightMarginBars(value) { rollbackRightMarginBars = value; },
  },
}));
rollbackViewportRuntime.registerConsumer(consumer(
  'reject-after-viewport', { gridVisible: true }, { failApply: true },
));
assert.throws(() => rollbackViewportRuntime.save(settingsValue({
  canvas: { rightMarginBars: 28 }, gridVisible: false,
})));
assert.equal(rollbackRightMarginBars, 12,
  'a later Settings consumer failure must roll back the Viewport default');

unregister();
unregister();
console.log('v7 Workstation Settings harness passed');
