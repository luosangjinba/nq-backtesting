import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_VIEWPORT_COMMANDS,
  JOURNAL_COMMANDS,
  JOURNAL_PERSISTENCE_COMMANDS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createJournalSurfaceState } from '../src/shell/journal-surface-model.js';
import { mountJournalSurface } from '../src/shell/journal-surface.js';

function createElement() {
  const listeners = new Map();
  return {
    hidden: false,
    innerHTML: '',
    textContent: '',
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    async dispatch(name) {
      return listeners.get(name)?.();
    },
    removeEventListener(name, listener) {
      if (listeners.get(name) === listener) {
        listeners.delete(name);
      }
    },
    setAttribute(name, value) {
      this[name] = String(value);
    },
  };
}

function createFakeRoot() {
  const elements = new Map();
  function elementFor(selector) {
    if (!elements.has(selector)) {
      elements.set(selector, createElement());
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
    elementFor,
  };
}

const modeled = createJournalSurfaceState({
  analytics: { netPnl: 2 },
  entries: [{
    id: 'entry-a',
    symbol: 'NQ',
    side: 'buy',
    quantity: 1,
    entryPrice: 100,
  }],
  lastSnapshot: { key: 'snapshot-a' },
});
assert.equal(modeled.count, 1);
assert.deepEqual(modeled.entryLabels, ['NQ buy 1@100']);
assert.equal(modeled.pnlLabel, 'Net P/L 2');
assert.equal(modeled.snapshotLabel, 'Saved snapshot-a');

let entries = [];
let snapshotEntries = [];
const calls = [];
const forbiddenCommands = new Set([
  BAR_DATA_COMMANDS.LOAD_WINDOW,
  CHART_DATA_COMMANDS.APPEND_BARS,
  CHART_DATA_COMMANDS.REPLACE_BARS,
  CHART_VIEWPORT_COMMANDS.ENSURE_INTENT,
  CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT,
  REPLAY_COMMANDS.LOAD_SESSION,
  REPLAY_COMMANDS.NEXT,
  REPLAY_COMMANDS.RESET,
]);

async function dispatchCommand(command, payload = {}) {
  calls.push({ command, payload });
  assert.equal(forbiddenCommands.has(command), false, `${command} must not be dispatched`);
  if (command === JOURNAL_COMMANDS.LIST_ENTRIES) return entries.map((entry) => ({ ...entry }));
  if (command === JOURNAL_COMMANDS.ANALYZE_RECORDS) {
    return {
      entryCount: payload.records.length,
      netPnl: payload.records.length,
    };
  }
  if (command === JOURNAL_COMMANDS.ADD_ENTRY) {
    entries = [...entries, { ...payload }];
    return { ...payload };
  }
  if (command === JOURNAL_PERSISTENCE_COMMANDS.SAVE_SNAPSHOT) {
    snapshotEntries = entries.map((entry) => ({ ...entry }));
    return {
      key: payload.key,
      value: { entries: snapshotEntries },
    };
  }
  if (command === JOURNAL_PERSISTENCE_COMMANDS.LOAD_SNAPSHOT) {
    entries = snapshotEntries.map((entry) => ({ ...entry }));
    return {
      entries,
      key: payload.key,
    };
  }
  throw new Error(`Unexpected command ${command}`);
}

const root = createFakeRoot();
const panel = root.elementFor('[data-v6-journal-panel]');
panel.hidden = true;
const controller = mountJournalSurface(root, { dispatchCommand, snapshotKey: 'surface' });
await Promise.resolve();
await Promise.resolve();
calls.length = 0;
await controller.refresh();

assert.deepEqual(calls.map((call) => call.command), [
  JOURNAL_COMMANDS.LIST_ENTRIES,
  JOURNAL_COMMANDS.ANALYZE_RECORDS,
]);
assert.equal(root.text('[data-v6-journal-count]'), '0 journal entries');
assert.equal(root.text('[data-v6-journal-pnl]'), 'Net P/L 0');
assert.equal(controller.getState().open, false);

await root.elementFor('[data-v6-journal-toggle]').dispatch('click');
assert.equal(controller.getState().open, true);
assert.equal(panel.hidden, false);

calls.length = 0;
await root.elementFor('[data-v6-journal-add]').dispatch('click');
assert.deepEqual(calls.map((call) => call.command), [
  JOURNAL_COMMANDS.ADD_ENTRY,
  JOURNAL_COMMANDS.LIST_ENTRIES,
  JOURNAL_COMMANDS.ANALYZE_RECORDS,
]);
assert.equal(controller.getState().count, 1);
assert.match(root.html('[data-v6-journal-list]'), /journal-sample-001/);

calls.length = 0;
await root.elementFor('[data-v6-journal-save]').dispatch('click');
assert.deepEqual(calls.map((call) => call.command), [
  JOURNAL_PERSISTENCE_COMMANDS.SAVE_SNAPSHOT,
  JOURNAL_COMMANDS.LIST_ENTRIES,
  JOURNAL_COMMANDS.ANALYZE_RECORDS,
]);
assert.equal(controller.getState().snapshotLabel, 'Saved surface');

entries = [];
calls.length = 0;
await root.elementFor('[data-v6-journal-load]').dispatch('click');
assert.deepEqual(calls.map((call) => call.command), [
  JOURNAL_PERSISTENCE_COMMANDS.LOAD_SNAPSHOT,
  JOURNAL_COMMANDS.LIST_ENTRIES,
  JOURNAL_COMMANDS.ANALYZE_RECORDS,
]);
assert.equal(controller.getState().count, 1);

controller.unmount();

console.log('v6 journal surface controller smoke passed');
