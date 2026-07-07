import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { getVisibleRecentSessionRowActions } from '../src/shell/session-row-action-boundaries.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const shellSource = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
const leftRailSource = shellSource.slice(
  shellSource.indexOf('data-v6-left-drawing-rail'),
  shellSource.indexOf('<section class="chart-surface"'),
);

assert.equal(leftRailSource.includes('data-v6-left-drawing-rail'), true);
assert.equal(leftRailSource.includes('disabled'), true);
for (const forbiddenToken of [
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'REPLAY_COMMANDS',
  'BAR_DATA_COMMANDS',
  'DEFAULT_WALL_COMMANDS',
  'DISPLAY_TIMEFRAME_COMMANDS',
  'dispatch',
  'data-v6-rail-order',
  'Order',
  'Calendar',
]) {
  assert.equal(leftRailSource.includes(forbiddenToken), false, `left rail must not expose ${forbiddenToken}`);
}

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

const page = await openV6Page({ height: 820, width: 1360 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      localStorage.removeItem('v6.sessions.metadata');
      document.querySelector('[data-v6-session-setup-name]').value = 'Left rail layout';
      document.querySelector('[data-v6-session-setup-start]').value = '2026-06-01T09:30';
      document.querySelector('[data-v6-session-setup-end]').value = '2026-06-01T10:30';
      document.querySelector('[data-v6-dashboard-create-session]').click();
      const deadline = performance.now() + 5000;
      while (document.querySelector('[data-v6-root]')?.dataset.v6Surface !== 'workstation' && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      const rectOf = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
          bottom: Math.round(rect.bottom),
          height: Math.round(rect.height),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
        };
      };
      const rail = document.querySelector('[data-v6-left-drawing-rail]');
      const buttons = [...rail.querySelectorAll('[data-v6-left-drawing-tool]')];
      const beforeChart = rectOf('[data-v6-chart-surface]');
      const beforeHost = rectOf('[data-v6-chart-engine-host]');
      for (const button of buttons) {
        button.click();
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
      const afterChart = rectOf('[data-v6-chart-surface]');
      const afterHost = rectOf('[data-v6-chart-engine-host]');
      const canvasCount = document.querySelectorAll('[data-v6-chart-engine-host] canvas').length;
      return {
        afterChart,
        afterHost,
        beforeChart,
        beforeHost,
        buttonDisabled: buttons.map((button) => button.disabled),
        buttonLabels: buttons.map((button) => button.getAttribute('aria-label') || ''),
        buttonTools: buttons.map((button) => button.dataset.v6LeftDrawingTool),
        chart: rectOf('[data-v6-chart-surface]'),
        chartSurfaceButtonLabels: [...document.querySelectorAll('[data-v6-chart-surface] button')]
          .map((button) => button.getAttribute('aria-label') || button.textContent.trim()),
        host: rectOf('[data-v6-chart-engine-host]'),
        leftRail: rectOf('[data-v6-left-drawing-rail]'),
        main: rectOf('[data-v6-workstation-main]'),
        rightRail: rectOf('[data-v6-right-utility-rail]'),
        canvasCount,
      };
    })()))()
  `));

  assert.deepEqual(value.buttonTools, [
    'cursor',
    'trend-line',
    'horizontal-line',
    'rectangle',
    'measure',
    'text',
  ]);
  assert.deepEqual(value.buttonLabels, [
    'Cursor tool',
    'Trend line tool',
    'Horizontal line tool',
    'Rectangle tool',
    'Measure tool',
    'Text note tool',
  ]);
  assert.deepEqual(value.buttonDisabled, [true, true, true, true, true, true]);
  assert.equal(value.leftRail.width, 48);
  assert.equal(Math.abs(value.leftRail.height - value.main.height) <= 2, true);
  assert.equal(value.chart.left >= value.leftRail.right - 1, true);
  assert.equal(value.chart.right <= value.rightRail.left + 1, true);
  assert.equal(value.host.width, value.chart.width);
  assert.equal(value.host.height, value.chart.height);
  assert.equal(value.host.width > 0, true);
  assert.equal(value.host.height > 0, true);
  assert.equal(value.canvasCount > 0, true);
  assert.deepEqual(value.beforeChart, value.afterChart);
  assert.deepEqual(value.beforeHost, value.afterHost);
  assert.deepEqual(value.chartSurfaceButtonLabels, ['Reset chart view']);
} finally {
  await page.cleanup();
}

console.log('v6 left drawing rail browser smoke passed');
