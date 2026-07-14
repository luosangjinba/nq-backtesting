import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { getVisibleRecentSessionRowActions } from '../src/shell/session-row-action-boundaries.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const auditDoc = await readFile('v6/docs/V6_WORKSTATION_RAIL_REGRESSION_AUDIT.md', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');
const leftRailDoc = await readFile('v6/docs/V6_LEFT_DRAWING_RAIL_RESERVATION.md', 'utf8');
const sliceDoc = await readFile('v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION.md', 'utf8');
const guardrailsDoc = await readFile('v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md', 'utf8');
const shellSource = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
assert.doesNotMatch(shellSource, /data-v6-left-drawing-rail|data-v6-left-drawing-tool/);

assert.equal(indexDoc.includes('V6_WORKSTATION_RAIL_REGRESSION_AUDIT.md'), true);
assert.match(auditDoc, /left drawing rail is shell-owned, 48px wide, and inert/);
assert.match(auditDoc, /chart surface sits between the left drawing rail and right utility rail/);
assert.match(auditDoc, /chart engine host remains mounted inside the chart surface/);
assert.match(auditDoc, /dashboard visible row actions remain Summary, Stats, Copy, and Journal/);
assert.match(leftRailDoc, /all drawing\/tool placeholder buttons are disabled/);
assert.match(sliceDoc, /preserve existing top toolbar, right rail, bottom transport, status\/OHLC/);
assert.match(guardrailsDoc, /The left toolbar is a vertical drawing\/tool strip using icon buttons/);

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

const page = await openV6Page({ height: 860, width: 1440 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      localStorage.removeItem('v6.sessions.metadata');
      document.querySelector('[data-v6-session-setup-name]').value = 'Rail regression audit';
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
      const labelsOf = (selector) => [...document.querySelectorAll(selector)].map((element) => (
        element.getAttribute('aria-label') || element.textContent.trim()
      ));
      return {
        chart: rectOf('[data-v6-chart-surface]'),
        chartButtonLabels: labelsOf('[data-v6-chart-surface] button'),
        chartToolbarExists: Boolean(document.querySelector('.chart-toolbar')),
        host: rectOf('[data-v6-chart-engine-host]'),
        drawingEntryCount: document.querySelectorAll('[data-v6-left-drawing-rail], [data-v6-left-drawing-tool]').length,
        main: rectOf('[data-v6-workstation-main]'),
        reset: rectOf('[data-v6-reset-view]'),
        rightRail: rectOf('[data-v6-right-utility-rail]'),
        status: rectOf('[data-v6-status-readout]'),
        topBar: rectOf('[data-v6-workstation-header]'),
        transport: rectOf('[data-v6-transport]'),
        transportLabel: document.querySelector('[data-v6-transport]')?.getAttribute('aria-label') || '',
        viewportWidth: window.innerWidth,
      };
    })()))()
  `));

  assert.equal(value.chartToolbarExists, false);
  assert.equal(value.chartButtonLabels.length > 0, true);
  assert.equal(value.chartButtonLabels.every((label) => /^(Maximize chart|Reset .+ pane view)$/.test(label)), true);
  assert.equal(value.chartButtonLabels.some((label) => /Cursor|Trend|Horizontal|Rectangle|Measure|Text/.test(label)), false);
  assert.equal(value.drawingEntryCount, 0);
  assert.equal(value.rightRail.width, 48);
  assert.equal(Math.abs(value.rightRail.height - value.main.height) <= 2, true);
  assert.equal(value.chart.left <= value.main.left + 2, true);
  assert.equal(value.chart.right <= value.rightRail.left + 1, true);
  assert.equal(value.host.left, value.chart.left);
  assert.equal(value.host.top, value.chart.top);
  assert.equal(value.host.width, value.chart.width);
  assert.equal(value.host.height, value.chart.height);
  assert.equal(value.topBar.bottom <= value.main.top, true);
  assert.equal(value.status.left >= value.chart.left, true);
  assert.equal(value.status.top >= value.chart.top, true);
  assert.equal(value.status.right < value.reset.left, true);
  assert.equal(value.reset.right <= value.chart.right, true);
  assert.equal(value.reset.top >= value.chart.top, true);
  assert.equal(value.transportLabel, 'Replay transport');
  assert.equal(value.transport.width > 0, true);
  assert.equal(value.transport.height > 0, true);
  assert.equal(Math.abs((value.transport.left + value.transport.width / 2) - value.viewportWidth / 2) <= 2, true);
} finally {
  await page.cleanup();
}

console.log('v6 workstation rail regression audit browser smoke passed');
