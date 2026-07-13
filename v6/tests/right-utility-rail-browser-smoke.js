import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      localStorage.removeItem('v6.sessions.metadata');
      document.querySelector('[data-v6-session-setup-name]').value = 'Right rail layout';
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
      const chart = rectOf('[data-v6-chart-surface]');
      const host = rectOf('[data-v6-chart-engine-host]');
      const rail = rectOf('[data-v6-right-utility-rail]');
      const main = rectOf('[data-v6-workstation-main]');
      const beforeChart = rectOf('[data-v6-chart-surface]');
      const beforeHost = rectOf('[data-v6-chart-engine-host]');
      const gotoDetails = document.querySelector('[data-v6-rail-goto-details]');
      const gotoSummary = document.querySelector('[data-v6-rail-goto]');
      gotoSummary.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const afterChart = rectOf('[data-v6-chart-surface]');
      const afterHost = rectOf('[data-v6-chart-engine-host]');
      const menu = document.querySelector('[data-v6-rail-goto-menu]');
      const menuRect = rectOf('[data-v6-rail-goto-menu]');
      const inertButtons = [
        '[data-v6-rail-object-tree]',
        '[data-v6-rail-order]',
        '[data-v6-rail-news]',
        '[data-v6-rail-journal]',
        '[data-v6-rail-watch]',
      ].map((selector) => {
        const button = document.querySelector(selector);
        return {
          disabled: button.disabled,
          label: button.getAttribute('aria-label') || '',
          selector,
          text: button.textContent.trim(),
        };
      });
      const sessionSettingsDetails = document.querySelector('[data-v6-session-settings-details]');
      const sessionSettingsSummary = document.querySelector('[data-v6-rail-session-settings]');
      sessionSettingsSummary.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const sessionSettingsPanel = document.querySelector('[data-v6-session-settings-panel]');
      return {
        afterChart,
        afterHost,
        beforeChart,
        beforeHost,
        chart,
        gotoOpen: gotoDetails.open,
        host,
        inertButtons,
        main,
        menuOptionLabels: [...menu.querySelectorAll('button')].map((button) => button.textContent.trim()),
        menuOptionsDisabled: [...menu.querySelectorAll('button')].map((button) => button.disabled),
        menuRect,
        rail,
        sessionSettingsDisabledControls: [...sessionSettingsPanel.querySelectorAll('input, select, button')]
          .map((control) => control.disabled),
        sessionSettingsLabels: [...sessionSettingsPanel.querySelectorAll('legend')]
          .map((legend) => legend.textContent.trim()),
        sessionSettingsOpen: sessionSettingsDetails.open,
        sessionSettingsPanelRect: rectOf('[data-v6-session-settings-panel]'),
        chartToolbarExists: Boolean(document.querySelector('.chart-toolbar')),
        viewportWidth: window.innerWidth,
      };
    })()))()
  `));

  assert.equal(value.host.width, value.chart.width);
  assert.equal(value.host.height, value.chart.height);
  assert.equal(value.chartToolbarExists, false);
  assert.equal(value.chart.right <= value.rail.left + 1, true);
  assert.equal(value.rail.right <= value.viewportWidth - 8, true);
  assert.equal(value.rail.right >= value.viewportWidth - 16, true);
  assert.equal(value.rail.width, 48);
  assert.equal(Math.abs(value.rail.height - value.main.height) <= 2, true);
  assert.equal(value.gotoOpen, true);
  assert.equal(value.menuRect.right <= value.rail.left, true);
  assert.deepEqual(value.menuOptionLabels, [
    'Next Day Open Y',
    'Next Session Z',
    'Asian Session I',
    'London Session L',
    'New York Session N',
    'Custom Settings',
  ]);
  assert.deepEqual(value.menuOptionsDisabled, [true, true, true, true, true, true]);
  assert.deepEqual(value.inertButtons.map((button) => button.disabled), [true, true, true, true, true]);
  assert.deepEqual(value.inertButtons.map((button) => button.label), [
    'Show object tree',
    'Order',
    'News and calendar events',
    'Journal',
    'Watch tool',
  ]);
  assert.equal(value.sessionSettingsOpen, true);
  assert.deepEqual(value.sessionSettingsLabels, [
    'Session Info',
    'Balance & Assets',
    'Spreads & Commissions',
    'Date Range',
  ]);
  assert.deepEqual(value.sessionSettingsDisabledControls, [true, true, true, true, true, true, true, true, true, true]);
  assert.equal(value.sessionSettingsPanelRect.right <= value.rail.left + 1, true);
  assert.deepEqual(value.beforeChart, value.afterChart);
  assert.deepEqual(value.beforeHost, value.afterHost);
} finally {
  await page.cleanup();
}

console.log('v6 right utility rail browser smoke passed');
