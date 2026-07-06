import assert from 'node:assert/strict';
import {
  CHART_ENTRY_AUTO_PLAY_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_COMMANDS,
} from '../src/contracts/app-contracts.js';
import {
  createReplayTransportState,
  mountReplayTransport,
  resolveReplayTransportAction,
  syncReplayTransportStateFromReplay,
} from '../src/shell/replay-transport.js';

function createFakeElement({
  dataset = {},
  tagName = 'button',
} = {}) {
  const listeners = new Map();
  return {
    classList: {
      classes: new Set(),
      toggle(name, value) {
        if (value) this.classes.add(name);
        else this.classes.delete(name);
      },
    },
    dataset: { ...dataset },
    ownerDocument: null,
    tagName,
    textContent: '',
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    click(target = this) {
      listeners.get('click')?.({ target });
    },
    closest(selector) {
      if (selector === '[data-v6-transport-action]' && this.dataset.v6TransportAction) return this;
      if (selector === '[data-v6-transport-speed]' && this.dataset.v6TransportSpeed) return this;
      return null;
    },
    contains(target) {
      return target === this || this.children?.includes(target);
    },
    querySelector(selector) {
      if (selector === '[data-v6-transport-action="play-toggle"]') return this.playButton || null;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-v6-transport-speed]') return this.speedButtons || [];
      return [];
    },
    setAttribute(name, value) {
      this[name] = value;
    },
  };
}

function createFakeDocument() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    keydown(event) {
      listeners.get('keydown')?.({
        preventDefault() {
          event.prevented = true;
        },
        ...event,
      });
    },
  };
}

const initialState = createReplayTransportState();
assert.deepEqual(resolveReplayTransportAction('next', initialState), {
  command: CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT,
  nextState: initialState,
});
const play = resolveReplayTransportAction('play-toggle', initialState);
assert.equal(play.command, CHART_ENTRY_AUTO_PLAY_COMMANDS.START);
assert.equal(play.nextState.playing, true);
assert.deepEqual(play.payload, { speed: 1 });
assert.equal(resolveReplayTransportAction('play-toggle', play.nextState).command, CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP);
assert.deepEqual(syncReplayTransportStateFromReplay({ playing: false, speed: 2 }, { status: 'playing' }), {
  playing: true,
  speed: 2,
});
assert.deepEqual(syncReplayTransportStateFromReplay({ playing: true, speed: 4 }, { status: 'paused' }), {
  playing: false,
  speed: 4,
});

const fakeDocument = createFakeDocument();
const root = createFakeElement({ tagName: 'div' });
root.ownerDocument = fakeDocument;
const playButton = createFakeElement({ dataset: { v6TransportAction: 'play-toggle' } });
const nextButton = createFakeElement({ dataset: { v6TransportAction: 'next' } });
const speedButton = createFakeElement({ dataset: { v6TransportSpeed: '2' } });
root.playButton = playButton;
root.children = [playButton, nextButton, speedButton];
root.speedButtons = [speedButton];

const dispatched = [];
const eventListeners = new Map();
const controller = mountReplayTransport(root, {
  dispatchCommand: async (command, payload) => {
    dispatched.push({ command, payload });
    return { ok: true };
  },
  subscribeEvent: (eventName, listener) => {
    eventListeners.set(eventName, listener);
    return () => eventListeners.delete(eventName);
  },
});

root.click(playButton);
await Promise.resolve();
assert.deepEqual(dispatched.at(-1), {
  command: CHART_ENTRY_AUTO_PLAY_COMMANDS.START,
  payload: { speed: 1 },
});
assert.equal(controller.getState().playing, true);

root.click(nextButton);
await Promise.resolve();
assert.deepEqual(dispatched.at(-1), {
  command: CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT,
  payload: undefined,
});
assert.equal(controller.getState().playing, true);

root.click(speedButton);
await Promise.resolve();
assert.equal(controller.getState().speed, 2);
assert.equal(speedButton['aria-pressed'], 'true');
assert.deepEqual(dispatched.at(-1), {
  command: CHART_ENTRY_AUTO_PLAY_COMMANDS.SET_SPEED,
  payload: { speed: 2 },
});

eventListeners.get('replay:playbackChanged')?.({ status: 'paused' });
assert.equal(controller.getState().playing, false);
assert.equal(controller.getState().speed, 2);
assert.equal(playButton['aria-label'], 'Play replay');

const dispatchCountBeforePausedSpeed = dispatched.length;
root.click(speedButton);
await Promise.resolve();
assert.equal(dispatched.length, dispatchCountBeforePausedSpeed);

eventListeners.get('replay:playbackChanged')?.({ status: 'playing' });
assert.equal(controller.getState().playing, true);
assert.equal(controller.getState().speed, 2);
assert.equal(playButton['aria-label'], 'Pause replay');

fakeDocument.keydown({ key: 'ArrowRight', target: root });
await Promise.resolve();
assert.deepEqual(dispatched.at(-1), {
  command: CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT,
  payload: undefined,
});

fakeDocument.keydown({ key: ' ', target: root });
await Promise.resolve();
assert.deepEqual(dispatched.at(-1), {
  command: CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP,
  payload: undefined,
});
assert.equal(controller.getState().playing, false);

controller.destroy();

console.log('v6 replay transport controller smoke passed');
