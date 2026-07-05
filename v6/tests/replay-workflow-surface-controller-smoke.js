import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_VIEWPORT_COMMANDS,
  DEFAULT_WALL_COMMANDS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createReplayWorkflowSurfaceState } from '../src/shell/replay-workflow-surface-model.js';
import { mountReplayWorkflowSurface } from '../src/shell/replay-workflow-surface.js';

function createElement() {
  const listeners = new Map();
  return {
    hidden: false,
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
    elementFor,
  };
}

const modeled = createReplayWorkflowSurfaceState({
  replayState: {
    cursorTime: '2026-06-01T09:30:00.000Z',
    status: 'ready',
  },
  wallState: {
    chartBarCount: 5,
    forwardBarCount: 20,
  },
});
assert.equal(modeled.loaded, true);
assert.equal(modeled.replayLabel, 'ready at 2026-06-01T09:30:00.000Z');
assert.equal(modeled.wallLabel, '5 visible / 20 forward');

const forbiddenCommands = new Set([
  BAR_DATA_COMMANDS.LOAD_WINDOW,
  CHART_DATA_COMMANDS.APPEND_BARS,
  CHART_DATA_COMMANDS.REPLACE_BARS,
  CHART_VIEWPORT_COMMANDS.ENSURE_INTENT,
  CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT,
  DEFAULT_WALL_COMMANDS.LOAD,
  REPLAY_COMMANDS.LOAD_SESSION,
  REPLAY_COMMANDS.NEXT,
  REPLAY_COMMANDS.PLAY,
]);
let replayState = {
  cursorTime: '2026-06-01T09:30:00.000Z',
  status: 'playing',
};
const wallState = {
  chartBarCount: 3,
  forwardBarCount: 12,
};
const calls = [];

async function dispatchCommand(command) {
  calls.push(command);
  assert.equal(forbiddenCommands.has(command), false, `${command} must not be dispatched`);
  if (command === REPLAY_COMMANDS.GET_STATE) return { ...replayState };
  if (command === DEFAULT_WALL_COMMANDS.GET_STATE) return { ...wallState };
  if (command === REPLAY_COMMANDS.PAUSE) {
    replayState = { ...replayState, status: 'paused' };
    return { ...replayState };
  }
  if (command === REPLAY_COMMANDS.RESET) {
    replayState = {
      cursorTime: '2026-06-01T09:30:00.000Z',
      status: 'ready',
    };
    return { ...replayState };
  }
  throw new Error(`Unexpected command ${command}`);
}

const root = createFakeRoot();
const panel = root.elementFor('[data-v6-replay-workflow-panel]');
panel.hidden = true;
const controller = mountReplayWorkflowSurface(root, { dispatchCommand });
calls.length = 0;
await controller.refresh();

assert.deepEqual(calls, [REPLAY_COMMANDS.GET_STATE, DEFAULT_WALL_COMMANDS.GET_STATE]);
assert.equal(controller.getState().open, false);
assert.equal(root.text('[data-v6-replay-workflow-state]'), 'playing at 2026-06-01T09:30:00.000Z');
assert.equal(root.text('[data-v6-replay-workflow-wall]'), '3 visible / 12 forward');

await root.elementFor('[data-v6-replay-workflow-toggle]').dispatch('click');
assert.equal(controller.getState().open, true);
assert.equal(panel.hidden, false);

await root.elementFor('[data-v6-replay-workflow-pause]').dispatch('click');
await Promise.resolve();
await Promise.resolve();
assert.equal(controller.getState().replayState.status, 'paused');

await root.elementFor('[data-v6-replay-workflow-reset]').dispatch('click');
await Promise.resolve();
await Promise.resolve();
assert.equal(controller.getState().replayState.status, 'ready');

assert.deepEqual(calls, [
  REPLAY_COMMANDS.GET_STATE,
  DEFAULT_WALL_COMMANDS.GET_STATE,
  REPLAY_COMMANDS.PAUSE,
  REPLAY_COMMANDS.GET_STATE,
  DEFAULT_WALL_COMMANDS.GET_STATE,
  REPLAY_COMMANDS.RESET,
  REPLAY_COMMANDS.GET_STATE,
  DEFAULT_WALL_COMMANDS.GET_STATE,
]);

controller.unmount();

console.log('v6 replay workflow surface controller smoke passed');
