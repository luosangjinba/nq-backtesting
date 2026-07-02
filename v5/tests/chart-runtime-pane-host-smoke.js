import assert from 'node:assert/strict';
import { clearCommandsForTest, dispatchCommand, hasCommand } from '../src/runtime/commands.js';
import { clearEventsForTest } from '../src/runtime/events.js';
import { CHART_COMMANDS, createChartRuntime } from '../src/runtime/chart-runtime.js';

function createElement(tagName) {
  return {
    tagName,
    children: [],
    className: '',
    dataset: {},
    style: {},
    attributes: {},
    isConnected: true,
    clientWidth: 800,
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
const primaryHost = createElement('div');
primaryHost.dataset.chartHost = '';
primaryHost.dataset.chartPaneId = 'primary';
root.append(primaryHost);

const readyEvents = [];
const runtime = createChartRuntime();
runtime.start({
  root,
  emitEvent: (name, payload) => {
    if (name === 'chart:ready') {
      readyEvents.push(payload);
    }
  },
});

assert.equal(hasCommand(CHART_COMMANDS.MOUNT_HOST), true);
assert.equal(primaryHost.dataset.chartRuntimeMounted, 'true');
assert.equal(primaryHost.dataset.chartPaneId, 'primary');
assert.equal(readyEvents.at(-1).paneId, 'primary');

const reusedPrimary = await dispatchCommand(CHART_COMMANDS.MOUNT_HOST, {
  paneId: 'primary',
  host: primaryHost,
});
assert.deepEqual(reusedPrimary, {
  paneId: 'primary',
  mounted: true,
  reused: true,
});

const secondaryHost = createElement('div');
secondaryHost.dataset.chartHost = '';
secondaryHost.clientWidth = 600;
secondaryHost.clientHeight = 360;
root.append(secondaryHost);
const mountedSecondary = await dispatchCommand(CHART_COMMANDS.MOUNT_HOST, {
  paneId: 'secondary',
  host: secondaryHost,
});
assert.deepEqual(mountedSecondary, {
  paneId: 'secondary',
  mounted: true,
  reused: false,
});
assert.equal(secondaryHost.dataset.chartPaneId, 'secondary');
assert.equal(secondaryHost.dataset.chartRuntimeMounted, 'true');
assert.equal(readyEvents.at(-1).paneId, 'secondary');

await dispatchCommand(CHART_COMMANDS.REPLACE_BARS, {
  bars: [bar(30, 100), bar(31, 101)],
});
assert.equal(primaryHost.children[0].children[0].dataset.chartBarCount, '2');
assert.equal(secondaryHost.children[0].children[0].dataset.chartBarCount, '2');

const secondaryMetrics = await dispatchCommand(CHART_COMMANDS.GET_VIEWPORT_METRICS, {
  paneId: 'secondary',
});
assert.deepEqual(secondaryMetrics, {
  width: 600,
  height: 360,
  estimatedVisibleBars: 60,
  mounted: true,
});

const replacementPrimaryHost = createElement('div');
replacementPrimaryHost.dataset.chartHost = '';
root.append(replacementPrimaryHost);
const replacedPrimary = await dispatchCommand(CHART_COMMANDS.MOUNT_HOST, {
  paneId: 'primary',
  host: replacementPrimaryHost,
});
assert.equal(replacedPrimary.reused, false);
assert.equal(primaryHost.children.length, 0);
assert.equal(replacementPrimaryHost.dataset.chartPaneId, 'primary');
assert.equal(replacementPrimaryHost.children[0].children[0].dataset.chartBarCount, '2');

secondaryHost.isConnected = false;
await dispatchCommand(CHART_COMMANDS.MOUNT_HOST, {
  paneId: 'primary',
  host: replacementPrimaryHost,
});
assert.equal(secondaryHost.children.length, 0);

runtime.stop();
assert.equal(hasCommand(CHART_COMMANDS.MOUNT_HOST), false);

console.log('v5 chart runtime pane host smoke passed');
