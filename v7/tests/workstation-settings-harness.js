import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStorageAdapter } from '../src/session-persistence/public.js';
import {
  createWorkstationSettings,
  createWorkstationSettingsRuntime,
  deserializeWorkstationSettings,
  readWorkstationSettings,
  serializeWorkstationSettings,
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
assert.throws(
  () => createWorkstationSettings({ canvas: { gridVisible: true, unknown: false } }),
  (error) => error instanceof WorkstationSettingsError
    && error.code === negativeCode('unknown-canvas-field'),
);
assert.throws(
  () => createWorkstationSettings({ canvas: { gridVisible: 'yes' } }),
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
const runtime = createWorkstationSettingsRuntime({ storage });
assert.deepEqual(runtime.initialize(), {
  recoveryCode: null, revision: 0, settings: defaults,
});
const mounted = { gridVisible: null };
const unregister = runtime.registerConsumer(consumer('mounted-chart', mounted));
assert.equal(mounted.gridVisible, true, 'a mounted consumer must receive the current revision immediately');
const hiddenGrid = createWorkstationSettings({ canvas: { gridVisible: false } });
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
