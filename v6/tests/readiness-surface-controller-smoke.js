import assert from 'node:assert/strict';
import { createReadinessSurfaceState } from '../src/shell/readiness-surface-model.js';
import { mountReadinessSurface } from '../src/shell/readiness-surface.js';

function createFakeRoot() {
  const elements = new Map();
  function elementFor(selector) {
    if (!elements.has(selector)) {
      elements.set(selector, {
        dataset: {},
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
assert.equal(root.text('[data-v6-readiness-state]'), 'Attention');
assert.equal(root.text('[data-v6-readiness-runtime-count]'), '2 runtimes');
assert.equal(root.text('[data-v6-readiness-command-count]'), '5 commands');
assert.equal(root.text('[data-v6-readiness-gate-count]'), '4 gates');
assert.match(root.text('[data-v6-readiness-missing]'), /journalPersistence\.saveSnapshot/);
assert.match(root.html('[data-v6-readiness-gates]'), /Cache-hit latency/);
assert.equal(root.datasetFor('[data-v6-readiness-surface]').running, 'true');

console.log('v6 readiness surface controller smoke passed');
