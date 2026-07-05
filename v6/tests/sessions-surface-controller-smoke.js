import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_VIEWPORT_COMMANDS,
  REPLAY_COMMANDS,
  SESSION_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createSessionsSurfaceState } from '../src/shell/sessions-surface-model.js';
import { mountSessionsSurface } from '../src/shell/sessions-surface.js';

function createElement() {
  const listeners = new Map();
  return {
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

const modeled = createSessionsSurfaceState({
  activeSession: {
    id: 'session-a',
    startTime: '2026-06-01T09:30:00.000Z',
    symbol: 'NQ',
    timeframe: '1m',
  },
  sessions: [{
    id: 'session-a',
    symbol: 'NQ',
    timeframe: '1m',
  }],
});
assert.equal(modeled.count, 1);
assert.equal(modeled.activeSessionLabel, 'NQ 1m 2026-06-01T09:30:00Z');

let sessions = [];
let activeSession = null;
const calls = [];
const forbiddenCommands = new Set([
  BAR_DATA_COMMANDS.LOAD_WINDOW,
  CHART_DATA_COMMANDS.REPLACE_BARS,
  CHART_VIEWPORT_COMMANDS.ENSURE_INTENT,
  CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT,
  REPLAY_COMMANDS.LOAD_SESSION,
  REPLAY_COMMANDS.NEXT,
]);

async function dispatchCommand(command) {
  calls.push(command);
  assert.equal(forbiddenCommands.has(command), false, `${command} must not be dispatched`);
  if (command === SESSION_COMMANDS.GET_ACTIVE) return activeSession;
  if (command === SESSION_COMMANDS.LIST) return sessions.map((session) => ({ ...session }));
  if (command === SESSION_COMMANDS.CREATE) {
    activeSession = {
      id: 'session-created',
      startTime: '2026-06-01T09:30:00.000Z',
      symbol: 'NQ',
      timeframe: '1m',
    };
    sessions = [activeSession];
    return { ...activeSession };
  }
  throw new Error(`Unexpected command ${command}`);
}

const root = createFakeRoot();
const panel = root.elementFor('[data-v6-sessions-panel]');
panel.hidden = true;
const controller = mountSessionsSurface(root, { dispatchCommand });
await Promise.resolve();
await Promise.resolve();

assert.deepEqual(calls, [SESSION_COMMANDS.GET_ACTIVE, SESSION_COMMANDS.LIST]);
assert.equal(root.text('[data-v6-sessions-count]'), '0 replay sessions');
assert.equal(root.text('[data-v6-sessions-active]'), 'No active replay session');
assert.equal(controller.getState().open, false);

await root.elementFor('[data-v6-sessions-toggle]').dispatch('click');
assert.equal(controller.getState().open, true);
assert.equal(panel.hidden, false);

await root.elementFor('[data-v6-sessions-create]').dispatch('click');
await Promise.resolve();
await Promise.resolve();

assert.deepEqual(calls, [
  SESSION_COMMANDS.GET_ACTIVE,
  SESSION_COMMANDS.LIST,
  SESSION_COMMANDS.CREATE,
  SESSION_COMMANDS.GET_ACTIVE,
  SESSION_COMMANDS.LIST,
]);
assert.equal(controller.getState().count, 1);
assert.equal(root.text('[data-v6-sessions-count]'), '1 replay sessions');
assert.match(root.html('[data-v6-sessions-list]'), /session-created/);

controller.unmount();

console.log('v6 sessions surface controller smoke passed');
