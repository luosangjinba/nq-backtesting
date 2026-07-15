import assert from 'node:assert/strict';
import { createReadinessSurfaceState } from '../src/shell/readiness-surface-model.js';
import { mountReadinessSurface } from '../src/shell/readiness-surface.js';

function createFakeRoot() {
  const elements = new Map();
  function elementFor(selector) {
    if (!elements.has(selector)) {
      elements.set(selector, {
        dataset: {},
        hidden: false,
        innerHTML: '',
        textContent: '',
      });
    }
    return elements.get(selector);
  }
  return {
    querySelector: elementFor,
    text(selector) {
      return elementFor(selector).textContent;
    },
    html(selector) {
      return elementFor(selector).innerHTML;
    },
    datasetFor(selector) {
      return elementFor(selector).dataset;
    },
  };
}

const state = createReadinessSurfaceState({
  commands: [
    'defaultWall.next',
    'journalPersistence.saveSnapshot',
    'layout.getSnapshot',
    'persistence.saveRecord',
    'replay.next',
    'settings.getSnapshot',
  ],
  registrySnapshot: {
    running: true,
    started: ['runtime.replay', 'runtime.persistence', 'runtime.journalPersistence'],
  },
});
assert.equal(state.ready, true);
assert.equal(state.commandCount, 6);
assert.equal(state.gateCount, 4);
assert.equal(state.statusLabel, 'System ready');
assert.equal(state.runtimeLabel, '3 services active');
assert.deepEqual(state.missingCommands, []);

const root = createFakeRoot();
let commandReads = 0;
const controller = mountReadinessSurface(root, {
  listCommands: () => {
    commandReads += 1;
    return [
      'defaultWall.next',
      'layout.getSnapshot',
      'persistence.saveRecord',
      'replay.next',
      'settings.getSnapshot',
    ];
  },
  registry: {
    snapshot: () => ({
      running: true,
      started: ['runtime.replay', 'runtime.persistence'],
    }),
  },
});

assert.equal(commandReads, 1);
assert.equal(controller.getState().ready, false);
assert.deepEqual(controller.getState().missingCommands, ['journalPersistence.saveSnapshot']);
assert.equal(root.text('[data-v6-readiness-state]'), 'System warming up');
assert.equal(root.text('[data-v6-readiness-runtime-count]'), '2 services active');
assert.equal(root.text('[data-v6-readiness-command-count]'), 'Setup pending');
assert.equal(root.text('[data-v6-readiness-gate-count]'), 'Core checks pending');
assert.equal(root.text('[data-v6-readiness-missing]'), 'Some services are still starting');
assert.equal(root.html('[data-v6-readiness-gates]'), '');
assert.equal(root.datasetFor('[data-v6-readiness-gates]').gateCount, '4');
assert.equal(root.datasetFor('[data-v6-readiness-surface]').running, 'true');
assert.equal(root.querySelector('[data-v6-readiness-surface]').hidden, false);

const readyRoot = createFakeRoot();
mountReadinessSurface(readyRoot, {
  listCommands: () => [
    'defaultWall.next',
    'journalPersistence.saveSnapshot',
    'layout.getSnapshot',
    'persistence.saveRecord',
    'replay.next',
    'settings.getSnapshot',
  ],
  registry: {
    snapshot: () => ({ running: true, started: ['runtime.replay'] }),
  },
});
assert.equal(readyRoot.querySelector('[data-v6-readiness-surface]').hidden, true);

console.log('v6 readiness surface controller smoke passed');
