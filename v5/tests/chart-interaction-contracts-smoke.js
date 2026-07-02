import assert from 'node:assert/strict';
import { clearCommandsForTest, dispatchCommand, hasCommand } from '../src/runtime/commands.js';
import { clearEventsForTest, emitEvent, subscribeEvent } from '../src/runtime/events.js';
import { CHART_COMMANDS, CHART_EVENTS, createChartRuntime } from '../src/runtime/chart-runtime.js';

function createElement(tagName) {
  return {
    tagName,
    children: [],
    className: '',
    dataset: {},
    style: {},
    attributes: {},
    title: '',
    textContent: '',
    isConnected: true,
    clientWidth: 80,
    clientHeight: 420,
    append(child) {
      this.children.push(child);
    },
    replaceChildren(...children) {
      this.children = children;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    getBoundingClientRect() {
      return {
        width: this.clientWidth,
        height: this.clientHeight,
      };
    },
    querySelectorAll(selector) {
      if (selector !== '[data-chart-host]') return [];
      const matches = [];
      const visit = (node) => {
        if (node.dataset?.chartHost !== undefined) matches.push(node);
        node.children?.forEach(visit);
      };
      visit(this);
      return matches;
    },
  };
}

function bar(minute, open) {
  return {
    time: `2026-06-01T09:${String(minute).padStart(2, '0')}:00.000Z`,
    open,
    high: open + 1,
    low: open - 1,
    close: open + 0.5,
  };
}

clearCommandsForTest();
clearEventsForTest();

globalThis.document = { createElement };
globalThis.MutationObserver = class {
  observe() {}
  disconnect() {}
};

const root = createElement('div');
const host = createElement('div');
host.dataset.chartHost = '';
root.append(host);

const visibleRangeEvents = [];
const viewportDemandEvents = [];
const unsubscribeVisible = subscribeEvent(CHART_EVENTS.VISIBLE_RANGE_CHANGED, (payload) => {
  visibleRangeEvents.push(payload);
});
const unsubscribeViewportDemand = subscribeEvent(CHART_EVENTS.VIEWPORT_DEMAND, (payload) => {
  viewportDemandEvents.push(payload);
});

const runtime = createChartRuntime();
runtime.start({ root, emitEvent });

assert.equal(hasCommand(CHART_COMMANDS.SET_MANUAL_VISIBLE_RANGE), true);
assert.equal(hasCommand(CHART_COMMANDS.GO_TO_TIME), true);
assert.equal(hasCommand(CHART_COMMANDS.ZOOM_VISIBLE_RANGE), true);
assert.equal(hasCommand(CHART_COMMANDS.PAN_VISIBLE_RANGE), true);
assert.equal(hasCommand(CHART_COMMANDS.RESUME_VIEWPORT_FOLLOW), true);
assert.equal(hasCommand(CHART_COMMANDS.GET_INTERACTION_STATE), true);

const bars = [
  bar(25, 95),
  bar(26, 96),
  bar(27, 97),
  bar(28, 98),
  bar(29, 99),
  bar(30, 100),
  bar(31, 101),
  bar(32, 102),
  bar(33, 103),
  bar(34, 104),
  bar(35, 105),
];
await dispatchCommand(CHART_COMMANDS.REPLACE_BARS, { bars });
await dispatchCommand(CHART_COMMANDS.SET_DISPLAY_CONTEXT, {
  instrument: 'NQ',
  displayTimeframe: 1,
  loadedCoverage: {
    from: '2026-06-01T09:25:00.000Z',
    to: '2026-06-01T09:35:00.000Z',
  },
});
await dispatchCommand(CHART_COMMANDS.SET_RIGHT_EDGE_LIMIT, {
  rightEdge: '2026-06-01T09:35:00.000Z',
});

const followed = await dispatchCommand(CHART_COMMANDS.SET_VIEWPORT_FOLLOW, {
  enabled: true,
  cursorTimestamp: '2026-06-01T09:35:00.000Z',
  estimatedVisibleBars: 5,
  rightOffsetBars: 1,
});
assert.equal(followed.interaction.mode, 'follow');
assert.deepEqual(
  followed.renderedBars.map((item) => item.time),
  [
    '2026-06-01T09:32:00.000Z',
    '2026-06-01T09:33:00.000Z',
    '2026-06-01T09:34:00.000Z',
    '2026-06-01T09:35:00.000Z',
  ]
);

await dispatchCommand(CHART_COMMANDS.SET_MANUAL_VISIBLE_RANGE, {
  from: '2026-06-01T09:33:00.000Z',
  to: '2026-06-01T09:35:00.000Z',
});
const manualRightEdge = await dispatchCommand(CHART_COMMANDS.SET_RIGHT_EDGE_LIMIT, {
  rightEdge: '2026-06-01T09:34:00.000Z',
});
assert.deepEqual(manualRightEdge.visibleRange, {
  from: Date.parse('2026-06-01T09:33:00.000Z') / 1000,
  to: Date.parse('2026-06-01T09:35:00.000Z') / 1000,
});
assert.deepEqual(manualRightEdge.interaction.manualVisibleRange, manualRightEdge.visibleRange);
assert.deepEqual(
  manualRightEdge.renderedBars.map((item) => item.time),
  [
    '2026-06-01T09:33:00.000Z',
    '2026-06-01T09:34:00.000Z',
  ]
);
assert.equal(host.children[0].dataset.renderedBarCount, '2');

await dispatchCommand(CHART_COMMANDS.SET_RIGHT_EDGE_LIMIT, {
  rightEdge: '2026-06-01T09:35:00.000Z',
});
visibleRangeEvents.length = 0;
viewportDemandEvents.length = 0;

const manual = await dispatchCommand(CHART_COMMANDS.SET_MANUAL_VISIBLE_RANGE, {
  from: '2026-06-01T09:25:00.000Z',
  to: '2026-06-01T09:27:00.000Z',
});
assert.equal(manual.interaction.mode, 'manual');
assert.equal(manual.viewportFollow.enabled, false);
assert.deepEqual(
  manual.renderedBars.map((item) => item.time),
  [
    '2026-06-01T09:25:00.000Z',
    '2026-06-01T09:26:00.000Z',
    '2026-06-01T09:27:00.000Z',
  ]
);
assert.equal(host.children[0].dataset.interactionMode, 'manual');
assert.equal(host.children[0].dataset.viewportFollow, 'false');
assert.equal(visibleRangeEvents.length, 1);
assert.equal(viewportDemandEvents.length, 1);

visibleRangeEvents.length = 0;
viewportDemandEvents.length = 0;
const goTo = await dispatchCommand(CHART_COMMANDS.GO_TO_TIME, {
  targetTimestamp: '2026-06-01T09:34:00.000Z',
  estimatedVisibleBars: 5,
});
assert.equal(goTo.interaction.mode, 'manual');
assert.equal(goTo.viewportFollow.enabled, false);
assert.equal(goTo.targetTimestamp, Date.parse('2026-06-01T09:34:00.000Z') / 1000);
assert.deepEqual(goTo.visibleRange, {
  from: Date.parse('2026-06-01T09:30:00.000Z') / 1000,
  to: Date.parse('2026-06-01T09:35:00.000Z') / 1000,
});
assert.deepEqual(
  goTo.renderedBars.map((item) => item.time),
  [
    '2026-06-01T09:30:00.000Z',
    '2026-06-01T09:31:00.000Z',
    '2026-06-01T09:32:00.000Z',
    '2026-06-01T09:33:00.000Z',
    '2026-06-01T09:34:00.000Z',
    '2026-06-01T09:35:00.000Z',
  ]
);
assert.equal(visibleRangeEvents.length, 1);

visibleRangeEvents.length = 0;
viewportDemandEvents.length = 0;
const zoomedIn = await dispatchCommand(CHART_COMMANDS.ZOOM_VISIBLE_RANGE, {
  direction: -1,
  ratio: 0.4,
});
assert.equal(zoomedIn.interaction.mode, 'manual');
assert.equal(zoomedIn.viewportFollow.enabled, false);
assert.deepEqual(zoomedIn.visibleRange, {
  from: Date.parse('2026-06-01T09:31:00.000Z') / 1000,
  to: Date.parse('2026-06-01T09:34:00.000Z') / 1000,
});
assert.deepEqual(
  zoomedIn.renderedBars.map((item) => item.time),
  [
    '2026-06-01T09:31:00.000Z',
    '2026-06-01T09:32:00.000Z',
    '2026-06-01T09:33:00.000Z',
    '2026-06-01T09:34:00.000Z',
  ]
);
assert.equal(visibleRangeEvents.length, 1);

const pannedLeft = await dispatchCommand(CHART_COMMANDS.PAN_VISIBLE_RANGE, {
  direction: -1,
  ratio: 1,
});
assert.equal(pannedLeft.interaction.mode, 'manual');
assert.equal(pannedLeft.viewportFollow.enabled, false);
assert.deepEqual(pannedLeft.visibleRange, {
  from: Date.parse('2026-06-01T09:28:00.000Z') / 1000,
  to: Date.parse('2026-06-01T09:31:00.000Z') / 1000,
});

const pannedRight = await dispatchCommand(CHART_COMMANDS.PAN_VISIBLE_RANGE, {
  direction: 1,
  ratio: 3,
});
assert.deepEqual(pannedRight.visibleRange, {
  from: Date.parse('2026-06-01T09:32:00.000Z') / 1000,
  to: Date.parse('2026-06-01T09:35:00.000Z') / 1000,
});
assert.deepEqual(
  pannedRight.renderedBars.map((item) => item.time),
  [
    '2026-06-01T09:32:00.000Z',
    '2026-06-01T09:33:00.000Z',
    '2026-06-01T09:34:00.000Z',
    '2026-06-01T09:35:00.000Z',
  ]
);

const replayFollowSync = await dispatchCommand(CHART_COMMANDS.SET_VIEWPORT_FOLLOW, {
  enabled: true,
  cursorTimestamp: '2026-06-01T09:35:00.000Z',
  estimatedVisibleBars: 5,
});
assert.equal(replayFollowSync.interaction.mode, 'manual');
assert.equal(replayFollowSync.viewportFollow.enabled, false);
assert.deepEqual(
  replayFollowSync.renderedBars.map((item) => item.time),
  pannedRight.renderedBars.map((item) => item.time)
);

const resumed = await dispatchCommand(CHART_COMMANDS.RESUME_VIEWPORT_FOLLOW);
assert.equal(resumed.interaction.mode, 'follow');
assert.equal(resumed.viewportFollow.enabled, true);
assert.equal(resumed.visibleRange, null);
assert.deepEqual(
  resumed.renderedBars.map((item) => item.time),
  [
    '2026-06-01T09:32:00.000Z',
    '2026-06-01T09:33:00.000Z',
    '2026-06-01T09:34:00.000Z',
    '2026-06-01T09:35:00.000Z',
  ]
);
assert.equal(host.children[0].dataset.interactionMode, 'follow');
assert.equal(host.children[0].dataset.viewportFollow, 'true');

const state = await dispatchCommand(CHART_COMMANDS.GET_INTERACTION_STATE);
assert.equal(state.interaction.mode, 'follow');
assert.equal(state.visibleRange, null);
assert.equal(state.fullBarCount, 11);

runtime.stop();
unsubscribeVisible();
unsubscribeViewportDemand();

console.log('v5 chart interaction contracts smoke passed');
