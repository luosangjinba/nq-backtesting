import assert from 'node:assert/strict';
import {
  CHART_ENTRY_AUTO_PLAY_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_COMMANDS,
  CHART_ENTRY_PROJECTION_APPLY_EVENTS,
  CHART_ENTRY_RESTART_COMMANDS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import {
  clampReplayTransportPosition,
  createReplayTransportState,
  mountReplayTransport,
  resolveReplayTransportAction,
  resolveReplayTransportPreviousAvailability,
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
    style: {},
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    click(target = this) {
      listeners.get('click')?.({ target });
    },
    dispatchEvent(event) {
      listeners.get(event.type)?.(event);
    },
    closest(selector) {
      if (selector === '[data-v6-transport-action]' && this.dataset.v6TransportAction) return this;
      if (selector === '[data-v6-transport-speed]' && this.dataset.v6TransportSpeed) return this;
      if (selector === '[data-v6-transport-speed-slider]' && this.dataset.v6TransportSpeedSlider) return this;
      if (selector === '[data-v6-transport-period-option]' && this.dataset.v6TransportPeriodOption) return this;
      if (selector === '[data-v6-transport-period-sync]' && this.dataset.v6TransportPeriodSync) return this;
      return null;
    },
    contains(target) {
      return target === this || Boolean(this.children?.some((child) => child === target || child.contains?.(target)));
    },
    focus() {
      if (this.ownerDocument) {
        this.ownerDocument.activeElement = this;
      }
    },
    querySelector(selector) {
      if (selector === '[data-v6-transport-action="play-toggle"]') return this.playButton || null;
      if (selector === '[data-v6-transport-action="next"]') return this.nextButton || null;
      if (selector === '[data-v6-transport-action="restart"]') return this.restartButton || null;
      if (selector === '[data-v6-transport-step-back]') return this.previousButton || null;
      if (selector === '[data-v6-transport-drag-handle]') return this.dragHandle || null;
      if (selector === '[data-v6-transport-speed-slider]') return this.speedSlider || null;
      if (selector === '[data-v6-transport-period-label]') return this.periodLabel || null;
      if (selector === '[data-v6-transport-period-toggle]') return this.periodTrigger || null;
      if (selector === '[data-v6-transport-period-details]') return this.periodDetails || null;
      if (selector === '[data-v6-transport-period-sync]') return this.periodSync || null;
      return null;
    },
    getBoundingClientRect() {
      const left = Number.parseFloat(this.style.left || this.rect?.left || 0);
      const top = Number.parseFloat(this.style.top || this.rect?.top || 0);
      const width = Number(this.rect?.width || 0);
      const height = Number(this.rect?.height || 0);
      return {
        bottom: top + height,
        height,
        left,
        right: left + width,
        top,
        width,
      };
    },
    querySelectorAll(selector) {
      if (selector === '[data-v6-transport-speed]') return this.speedButtons || [];
      if (selector === '[data-v6-transport-period-option]') return this.periodButtons || [];
      return [];
    },
    getAttribute(name) {
      return this[name];
    },
    setAttribute(name, value) {
      this[name] = value;
    },
  };
}

function createFakeDocument() {
  const listeners = new Map();
  return {
    activeElement: null,
    defaultView: {
      innerHeight: 160,
      innerWidth: 300,
      setTimeout,
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    dispatchEvent(event) {
      listeners.get(event.type)?.(event);
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
  period: '1m',
  periodSync: false,
  playing: true,
  previousAvailable: false,
  replayStatus: 'playing',
  speed: 2,
});
assert.deepEqual(syncReplayTransportStateFromReplay({ playing: true, speed: 4 }, { status: 'paused' }), {
  period: '1m',
  periodSync: false,
  playing: false,
  previousAvailable: false,
  replayStatus: 'paused',
  speed: 4,
});
assert.equal(resolveReplayTransportPreviousAvailability({ cursorIndex: 0, revealedCount: 1 }), false);
assert.equal(resolveReplayTransportPreviousAvailability({ cursorIndex: 1, revealedCount: 2 }), true);
assert.equal(resolveReplayTransportPreviousAvailability({ cursorIndex: 3, status: 'ended' }), true);
assert.equal(resolveReplayTransportPreviousAvailability({ revealedCount: 2 }), true);
assert.equal(resolveReplayTransportAction('next', createReplayTransportState({ replayStatus: 'ended' })).command, null);
assert.deepEqual(clampReplayTransportPosition({
  height: 40,
  left: 500,
  top: -20,
  viewportHeight: 160,
  viewportWidth: 300,
  width: 100,
}), {
  left: 200,
  top: 0,
});

const fakeDocument = createFakeDocument();
const root = createFakeElement({ tagName: 'div' });
root.ownerDocument = fakeDocument;
root.rect = {
  height: 40,
  left: 0,
  top: 0,
  width: 100,
};
const playButton = createFakeElement({ dataset: { v6TransportAction: 'play-toggle' } });
const nextButton = createFakeElement({ dataset: { v6TransportAction: 'next' } });
const restartButton = createFakeElement({ dataset: { v6TransportAction: 'restart' } });
const previousButton = createFakeElement({});
const dragHandle = createFakeElement({ tagName: 'button' });
const speedButton = createFakeElement({ dataset: { v6TransportSpeed: '2' } });
const speedSlider = createFakeElement({ dataset: { v6TransportSpeedSlider: 'true' }, tagName: 'input' });
const periodLabel = createFakeElement({ tagName: 'span' });
const periodDetails = createFakeElement({ tagName: 'details' });
const periodTrigger = createFakeElement({ tagName: 'summary' });
const periodButton = createFakeElement({ dataset: { v6TransportPeriodOption: '1m' } });
const periodButton3m = createFakeElement({ dataset: { v6TransportPeriodOption: '3m' } });
const periodButton5m = createFakeElement({ dataset: { v6TransportPeriodOption: '5m' } });
const periodSync = createFakeElement({ dataset: { v6TransportPeriodSync: 'true' }, tagName: 'input' });
const periodSyncParent = createFakeElement({ tagName: 'label' });
periodSync.parentElement = periodSyncParent;
[
  root,
  playButton,
  nextButton,
  restartButton,
  previousButton,
  dragHandle,
  speedButton,
  speedSlider,
  periodLabel,
  periodDetails,
  periodTrigger,
  periodButton,
  periodButton3m,
  periodButton5m,
  periodSync,
  periodSyncParent,
].forEach((element) => {
  element.ownerDocument = fakeDocument;
});
periodDetails.children = [periodTrigger, periodButton, periodButton3m, periodButton5m];
root.playButton = playButton;
root.nextButton = nextButton;
root.restartButton = restartButton;
root.previousButton = previousButton;
root.dragHandle = dragHandle;
root.speedSlider = speedSlider;
root.periodLabel = periodLabel;
root.periodDetails = periodDetails;
root.periodTrigger = periodTrigger;
root.periodSync = periodSync;
root.children = [
  playButton,
  nextButton,
  restartButton,
  previousButton,
  dragHandle,
  speedButton,
  speedSlider,
  periodDetails,
  periodSync,
];
root.speedButtons = [speedButton];
root.periodButtons = [periodButton, periodButton3m, periodButton5m];

const dispatched = [];
const savedPositions = [];
const eventListeners = new Map();
const controller = mountReplayTransport(root, {
  dispatchCommand: async (command, payload) => {
    dispatched.push({ command, payload });
    if (command === REPLAY_COMMANDS.GET_STATE) {
      return { status: 'ready' };
    }
    return { ok: true };
  },
  getVisiblePaneIds: () => ['main', 'secondary'],
  subscribeEvent: (eventName, listener) => {
    eventListeners.set(eventName, listener);
    return () => eventListeners.delete(eventName);
  },
  positionPreference: {
    load() {
      return {
        height: 40,
        left: 500,
        top: -20,
        width: 100,
      };
    },
    save(position) {
      savedPositions.push(position);
    },
  },
});

assert.equal(root.style.left, '200px');
assert.equal(root.style.top, '0px');
assert.equal(root.style.bottom, 'auto');
assert.equal(root.style.transform, 'none');
assert.equal(root.dataset.positionRestored, 'true');
assert.deepEqual(savedPositions.at(-1), {
  height: 40,
  left: 200,
  top: 0,
  width: 100,
});

dragHandle.dispatchEvent({
  clientX: 210,
  clientY: 10,
  preventDefault() {},
  type: 'pointerdown',
});
fakeDocument.dispatchEvent({
  clientX: 60,
  clientY: 80,
  type: 'pointermove',
});
fakeDocument.dispatchEvent({
  clientX: 60,
  clientY: 80,
  type: 'pointerup',
});
assert.equal(root.style.left, '50px');
assert.equal(root.style.top, '70px');
assert.deepEqual(savedPositions.at(-1), {
  height: 40,
  left: 50,
  top: 70,
  width: 100,
});

root.click(playButton);
await Promise.resolve();
assert.deepEqual(dispatched.at(-1), {
  command: CHART_ENTRY_AUTO_PLAY_COMMANDS.START,
  payload: { paneIds: ['main', 'secondary'], speed: 1 },
});
assert.equal(controller.getState().playing, true);
assert.equal(playButton['aria-pressed'], 'true');
assert.equal(playButton.title, 'Pause replay');
assert.equal(playButton.classList.classes.has('is-active'), true);

root.click(nextButton);
await Promise.resolve();
assert.deepEqual(dispatched.at(-1), {
  command: CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT,
  payload: { paneIds: ['main', 'secondary'] },
});
assert.equal(controller.getState().playing, true);

root.click(speedButton);
await Promise.resolve();
assert.equal(controller.getState().speed, 2);
assert.equal(speedSlider['aria-valuetext'], '2x replay speed');
assert.equal(speedButton['aria-pressed'], 'true');
assert.deepEqual(dispatched.at(-1), {
  command: CHART_ENTRY_AUTO_PLAY_COMMANDS.SET_SPEED,
  payload: { speed: 2 },
});

eventListeners.get('replay:playbackChanged')?.({ status: 'paused' });
assert.equal(controller.getState().playing, false);
assert.equal(controller.getState().replayStatus, 'paused');
assert.equal(controller.getState().previousAvailable, false);
assert.equal(controller.getState().speed, 2);
assert.equal(playButton['aria-label'], 'Play replay');
assert.equal(playButton.classList.classes.has('is-active'), false);

const dispatchCountBeforePausedSpeed = dispatched.length;
root.click(speedButton);
await Promise.resolve();
assert.equal(dispatched.length, dispatchCountBeforePausedSpeed);

eventListeners.get('replay:playbackChanged')?.({ status: 'playing' });
assert.equal(controller.getState().playing, true);
assert.equal(controller.getState().replayStatus, 'playing');
assert.equal(controller.getState().speed, 2);
assert.equal(playButton['aria-label'], 'Pause replay');

eventListeners.get('replay:advanced')?.({ cursorIndex: 1, revealedCount: 2, status: 'ready' });
assert.equal(controller.getState().playing, true);
assert.equal(controller.getState().replayStatus, 'ready');
assert.equal(controller.getState().previousAvailable, true);
assert.equal(root.dataset.previousAvailable, 'true');
assert.equal(previousButton.dataset.v6TransportPreviousAvailable, 'true');
assert.equal(previousButton.disabled, true);
assert.equal(previousButton['aria-disabled'], 'true');
assert.equal(playButton['aria-label'], 'Pause replay');

eventListeners.get('replay:rewound')?.({ cursorIndex: 0, revealedCount: 1, status: 'ready' });
assert.equal(controller.getState().previousAvailable, false);
assert.equal(root.dataset.previousAvailable, 'false');
assert.equal(previousButton.dataset.v6TransportPreviousAvailable, 'false');
assert.equal(previousButton.disabled, true);

fakeDocument.keydown({ key: 'ArrowRight', target: root });
await Promise.resolve();
assert.deepEqual(dispatched.at(-1), {
  command: CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT,
  payload: { paneIds: ['main', 'secondary'] },
});

fakeDocument.keydown({ key: ' ', target: root });
await Promise.resolve();
assert.deepEqual(dispatched.at(-1), {
  command: CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP,
  payload: undefined,
});
assert.equal(controller.getState().playing, false);

eventListeners.get('replay:playbackChanged')?.({ status: 'ended' });
assert.equal(controller.getState().replayStatus, 'ended');
assert.equal(controller.getState().playing, false);
assert.equal(root.dataset.ended, 'true');
assert.equal(root.dataset.playbackStatus, 'ended');
assert.equal(playButton.disabled, true);
assert.equal(nextButton.disabled, true);
assert.equal(restartButton.disabled, false);
assert.equal(playButton['aria-label'], 'Replay ended');
assert.equal(nextButton['aria-label'], 'Replay ended');
assert.equal(restartButton['aria-label'], 'Restart replay');
assert.equal(playButton.classList.classes.has('is-disabled'), true);
assert.equal(nextButton.classList.classes.has('is-disabled'), true);
assert.equal(restartButton.classList.classes.has('is-active'), true);
assert.equal(restartButton.classList.classes.has('is-disabled'), false);
const dispatchCountAtEnded = dispatched.length;
fakeDocument.keydown({ key: 'ArrowRight', target: root });
fakeDocument.keydown({ key: ' ', target: root });
await Promise.resolve();
assert.equal(dispatched.length, dispatchCountAtEnded);
assert.equal(root.dataset.lastAction, 'ended');
root.click(playButton);
root.click(nextButton);
await Promise.resolve();
assert.equal(dispatched.length, dispatchCountAtEnded);

root.click(restartButton);
await Promise.resolve();
assert.deepEqual(dispatched.find((entry) => entry.command === CHART_ENTRY_RESTART_COMMANDS.RESTART), {
  command: CHART_ENTRY_RESTART_COMMANDS.RESTART,
  payload: undefined,
});
assert.equal(['ready', 'restarting'].includes(controller.getState().replayStatus), true);
assert.equal(restartButton.disabled, true);
assert.equal(restartButton['aria-label'], 'Restart available after replay ends');
assert.equal(restartButton.classList.classes.has('is-disabled'), true);
assert.equal(periodLabel.textContent, '1m');
assert.equal(periodTrigger.title, 'Replay step period 1m');
assert.equal(periodButton['aria-checked'], 'true');
assert.equal(periodButton.classList.classes.has('is-active'), true);
assert.equal(periodSync['aria-checked'], 'false');
assert.equal(periodSync.title, 'Replay period is manual');
assert.equal(periodSyncParent.classList.classes.has('is-active'), false);

eventListeners.get('replay:playbackChanged')?.({ status: 'ended' });
assert.equal(controller.getState().replayStatus, 'restarting');
assert.equal(root.dataset.ended, 'false');

eventListeners.get('replay:loaded')?.({ status: 'ready' });
assert.equal(controller.getState().replayStatus, 'ready');
assert.equal(playButton.disabled, false);
assert.equal(nextButton.disabled, false);
assert.equal(restartButton.disabled, true);

periodDetails.open = false;
const dispatchCountBeforeMenuKeys = dispatched.length;
fakeDocument.keydown({ key: 'ArrowDown', target: periodTrigger });
assert.equal(periodDetails.open, true);
assert.equal(fakeDocument.activeElement, periodButton);
fakeDocument.keydown({ key: 'ArrowDown', target: periodButton });
assert.equal(fakeDocument.activeElement, periodButton3m);
fakeDocument.keydown({ key: 'End', target: periodButton3m });
assert.equal(fakeDocument.activeElement, periodButton5m);
fakeDocument.keydown({ key: ' ', target: periodButton5m });
fakeDocument.keydown({ key: 'ArrowRight', target: periodButton5m });
await Promise.resolve();
assert.equal(dispatched.length, dispatchCountBeforeMenuKeys);
fakeDocument.keydown({ key: 'Escape', target: periodButton5m });
assert.equal(periodDetails.open, false);
assert.equal(fakeDocument.activeElement, periodTrigger);

eventListeners.get('replay:playbackChanged')?.({ status: 'ended' });
assert.equal(controller.getState().replayStatus, 'ended');
root.click(restartButton);
await Promise.resolve();
eventListeners.get(CHART_ENTRY_PROJECTION_APPLY_EVENTS.APPLIED)?.({ sessionId: 'session-restart' });
await Promise.resolve();
assert.deepEqual(dispatched.at(-1), {
  command: REPLAY_COMMANDS.GET_STATE,
  payload: undefined,
});
assert.equal(controller.getState().replayStatus, 'ready');

controller.destroy();

console.log('v6 replay transport controller smoke passed');
