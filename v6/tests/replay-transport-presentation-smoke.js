import assert from 'node:assert/strict';
import { renderReplayTransport } from '../src/shell/replay-transport-presentation.js';

function control(dataset = {}) {
  const attributes = new Map();
  const classes = new Set();
  return {
    checked: false,
    classList: { toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); } },
    dataset: { ...dataset },
    disabled: false,
    getAttribute(name) { return attributes.get(name) ?? null; },
    hasClass(name) { return classes.has(name); },
    parentElement: null,
    querySelector() { return null; },
    removeAttribute(name) { attributes.delete(name); },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    textContent: '',
    value: '',
  };
}

const previous = control();
const playLabel = control();
const play = control();
play.querySelector = () => playLabel;
const next = control();
const restart = control();
const slider = control();
const speed1 = control({ v6TransportSpeed: '1' });
const speed2 = control({ v6TransportSpeed: '2' });
const periodLabel = control();
const periodTrigger = control();
const period1m = control({ v6TransportPeriodOption: '1m' });
const period5m = control({ v6TransportPeriodOption: '5m' });
const syncParent = control();
const sync = control();
sync.parentElement = syncParent;
const root = {
  dataset: {},
  querySelector(selector) {
    return new Map([
      ['[data-v6-transport-step-back]', previous],
      ['[data-v6-transport-action="play-toggle"]', play],
      ['[data-v6-transport-action="next"]', next],
      ['[data-v6-transport-action="restart"]', restart],
      ['[data-v6-transport-speed-slider]', slider],
      ['[data-v6-transport-period-label]', periodLabel],
      ['[data-v6-transport-period-toggle]', periodTrigger],
      ['[data-v6-transport-period-sync]', sync],
    ]).get(selector) || null;
  },
  querySelectorAll(selector) {
    if (selector === '[data-v6-transport-speed]') return [speed1, speed2];
    if (selector === '[data-v6-transport-period-option]') return [period1m, period5m];
    return [];
  },
};

renderReplayTransport(root, {
  period: '5m', periodSync: true, playing: true, previousAvailable: true, replayStatus: 'ready', speed: 2,
});
assert.equal(root.dataset.playback, 'playing');
assert.equal(previous.disabled, false);
assert.equal(playLabel.textContent, 'Pause replay');
assert.equal(speed2.hasClass('is-active'), true);
assert.equal(periodLabel.textContent, '5m');
assert.equal(period5m.getAttribute('aria-checked'), 'true');
assert.equal(sync.checked, true);

renderReplayTransport(root, {
  period: '1m', periodSync: false, playing: false, previousAvailable: false, replayStatus: 'ended', speed: 1,
});
assert.equal(root.dataset.ended, 'true');
assert.equal(previous.disabled, true);
assert.equal(play.disabled, true);
assert.equal(next.disabled, true);
assert.equal(restart.disabled, false);
assert.equal(playLabel.textContent, 'Replay ended');

console.log('v6 replay transport presentation smoke passed');
