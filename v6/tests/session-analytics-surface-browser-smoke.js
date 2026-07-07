import assert from 'node:assert/strict';
import {
  evaluate,
  waitForExpression,
} from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const STORAGE_KEY = 'v6.sessions.metadata';

const session = {
  accountBalance: 120000,
  autoUpdateEndDate: true,
  createdAt: '2026-07-07T10:00:00.000Z',
  endTime: '2026-07-05T23:00:00.000Z',
  id: 'analytics-session',
  name: 'Stats check',
  profileId: 'default-profile',
  startTime: '2026-07-01T16:30:00.000Z',
  status: 'created',
  symbol: 'NQ',
  symbols: ['NQ', 'ES'],
  timeframe: '5m',
  workspaceId: 'default-workspace',
};

const page = await openV6Page({ height: 820, width: 1360 });
try {
  await evaluate(page.client, `
    localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify({
      activeSessionId: null,
      sessions: [session],
      version: 1,
    }))});
  `);
  await page.client.send('Page.reload', { ignoreCache: true });
  await waitForExpression(page.client, `document.querySelector('[data-v6-root]')?.dataset.booted === 'true'`, 8000);

  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const root = document.querySelector('[data-v6-root]');
      const snapshot = async () => ({
        barCache: await commands.dispatchCommand('barData.getCacheSummary'),
        chartEntry: await commands.dispatchCommand('chartEntry.getState'),
        chartSummary: await commands.dispatchCommand('chartData.getSummary'),
        replay: await commands.dispatchCommand('replay.getState'),
      });
      const before = await snapshot();
      const statsButton = document.querySelector('[data-v6-row-action="analytics"]');
      const copyButton = document.querySelector('[data-v6-row-action="copy"]');
      const summaryButton = document.querySelector('[data-v6-row-action="summary"]');

      statsButton.focus();
      statsButton.click();
      const afterOpen = {
        activeLabel: document.activeElement?.getAttribute('aria-label') || '',
        fieldCount: document.querySelectorAll('[data-v6-session-analytics-field]').length,
        metricFields: [...document.querySelectorAll('[data-v6-session-analytics-metric]')]
          .map((field) => ({
            field: field.dataset.v6SessionAnalyticsMetric,
            status: field.dataset.v6SessionAnalyticsMetricStatus,
            value: field.querySelector('strong')?.textContent.trim() || '',
          })),
        state: root.__v6SessionDashboard.getState().analytics,
        summaryState: root.__v6SessionDashboard.getState().summary,
        title: document.querySelector('#v6-session-analytics-title')?.textContent.trim() || '',
        snapshot: await snapshot(),
      };

      document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
      const afterEscape = {
        activeAction: document.activeElement?.dataset?.v6RowAction || '',
        state: root.__v6SessionDashboard.getState().analytics,
        surfaceHidden: document.querySelector('[data-v6-session-analytics-surface]')?.hidden,
        snapshot: await snapshot(),
      };

      statsButton.focus();
      statsButton.click();
      summaryButton.click();
      const afterSummary = {
        analytics: root.__v6SessionDashboard.getState().analytics,
        summary: root.__v6SessionDashboard.getState().summary,
        summaryTitle: document.querySelector('#v6-session-summary-title')?.textContent.trim() || '',
        snapshot: await snapshot(),
      };

      summaryButton.focus();
      statsButton.click();
      document.querySelector('[data-v6-session-analytics-close]').click();
      const afterCloseButton = {
        activeAction: document.activeElement?.dataset?.v6RowAction || '',
        state: root.__v6SessionDashboard.getState().analytics,
        snapshot: await snapshot(),
      };

      copyButton.click();
      const afterCopy = {
        analytics: root.__v6SessionDashboard.getState().analytics,
        copyDisabled: copyButton.disabled,
        summary: root.__v6SessionDashboard.getState().summary,
        snapshot: await snapshot(),
      };

      return {
        afterCloseButton,
        afterCopy,
        afterEscape,
        afterOpen,
        afterSummary,
        before,
      };
    })()))()
  `));

  assert.deepEqual(value.before.chartSummary, { paneCount: 0, panes: [] });
  assert.deepEqual(value.before.barCache, { barCount: 0, keys: [], windowCount: 0 });
  assert.equal(value.before.replay, null);
  assert.equal(value.before.chartEntry.status, 'idle');

  assert.equal(value.afterOpen.activeLabel, 'Close session stats');
  assert.equal(value.afterOpen.fieldCount, 14);
  assert.equal(value.afterOpen.title, 'Stats check Stats');
  assert.deepEqual(value.afterOpen.state, {
    open: true,
    owner: 'session-analytics',
    sessionId: 'analytics-session',
  });
  assert.deepEqual(value.afterOpen.summaryState, {
    open: false,
    owner: null,
    sessionId: null,
  });
  assert.equal(value.afterOpen.metricFields.length, 10);
  assert.ok(value.afterOpen.metricFields.every((field) => field.status === 'unavailable'));
  assert.ok(value.afterOpen.metricFields.every((field) => field.value === '--'));
  assert.deepEqual(value.afterOpen.snapshot, value.before);

  assert.deepEqual(value.afterEscape.state, {
    open: false,
    owner: null,
    sessionId: null,
  });
  assert.equal(value.afterEscape.activeAction, 'analytics');
  assert.equal(value.afterEscape.surfaceHidden, true);
  assert.deepEqual(value.afterEscape.snapshot, value.before);

  assert.deepEqual(value.afterSummary.analytics, value.afterEscape.state);
  assert.deepEqual(value.afterSummary.summary, {
    open: true,
    owner: 'session-summary',
    sessionId: 'analytics-session',
  });
  assert.equal(value.afterSummary.summaryTitle, 'Stats check');
  assert.deepEqual(value.afterSummary.snapshot, value.before);

  assert.deepEqual(value.afterCloseButton.state, value.afterEscape.state);
  assert.equal(value.afterCloseButton.activeAction, 'analytics');
  assert.deepEqual(value.afterCloseButton.snapshot, value.before);

  assert.equal(value.afterCopy.copyDisabled, true);
  assert.deepEqual(value.afterCopy.analytics, value.afterEscape.state);
  assert.deepEqual(value.afterCopy.summary, value.afterEscape.state);
  assert.deepEqual(value.afterCopy.snapshot, value.before);
} finally {
  await page.cleanup();
}

console.log('v6 session analytics surface browser smoke passed');
