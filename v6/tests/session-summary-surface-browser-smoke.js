import assert from 'node:assert/strict';
import {
  evaluate,
  waitForExpression,
} from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const STORAGE_KEY = 'v6.sessions.metadata';

const session = {
  accountBalance: 100000,
  autoUpdateEndDate: false,
  createdAt: '2026-07-05T10:00:00.000Z',
  endTime: '2026-07-05T23:00:00.000Z',
  id: 'summary-session',
  name: 'Summary check',
  profileId: 'default-profile',
  startTime: '2026-07-01T16:30:00.000Z',
  status: 'created',
  symbol: 'ES',
  symbols: ['ES', 'NQ'],
  timeframe: '1m',
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
      const summaryButton = document.querySelector('[data-v6-row-action="summary"]');
      const disabledActions = [...document.querySelectorAll('[data-v6-row-action]:not([data-v6-row-action="summary"])')]
        .map((button) => ({
          id: button.dataset.v6RowAction,
          disabled: button.disabled,
          ariaDisabled: button.getAttribute('aria-disabled'),
        }));

      summaryButton.focus();
      summaryButton.click();
      const afterOpen = {
        activeLabel: document.activeElement?.getAttribute('aria-label') || '',
        fieldCount: document.querySelectorAll('[data-v6-session-summary-field]').length,
        inlineRow: Boolean(document.querySelector('[data-v6-session-summary-surface]')?.closest('[data-v6-dashboard-session-row]')),
        state: root.__v6SessionDashboard.getState().summary,
        title: document.querySelector('#v6-session-summary-title')?.textContent.trim() || '',
        snapshot: await snapshot(),
      };

      document.querySelector('[data-v6-dashboard-search]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      const afterOutside = {
        state: root.__v6SessionDashboard.getState().summary,
        surfaceHidden: document.querySelector('[data-v6-session-summary-surface]')?.hidden,
      };
      summaryButton.click();
      document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
      const afterEscape = {
        activeAction: document.activeElement?.dataset?.v6RowAction || '',
        state: root.__v6SessionDashboard.getState().summary,
        surfaceHidden: document.querySelector('[data-v6-session-summary-surface]')?.hidden,
        snapshot: await snapshot(),
      };

      summaryButton.focus();
      summaryButton.click();
      document.querySelector('[data-v6-session-summary-close]').click();
      const afterCloseButton = {
        activeAction: document.activeElement?.dataset?.v6RowAction || '',
        state: root.__v6SessionDashboard.getState().summary,
        snapshot: await snapshot(),
      };

      return {
        afterCloseButton,
        afterEscape,
        afterOpen,
        afterOutside,
        before,
        disabledActions,
      };
    })()))()
  `));

  assert.deepEqual(value.before.chartSummary, { paneCount: 0, panes: [] });
  assert.deepEqual(value.before.barCache, { barCount: 0, keys: [], windowCount: 0 });
  assert.equal(value.before.replay, null);
  assert.equal(value.before.chartEntry.status, 'idle');
  assert.deepEqual(value.disabledActions, [
    { id: 'analytics', disabled: false, ariaDisabled: 'false' },
    { id: 'copy', disabled: false, ariaDisabled: 'false' },
    { id: 'journal', disabled: false, ariaDisabled: 'false' },
  ]);

  assert.equal(value.afterOpen.activeLabel, 'Close session summary');
  assert.equal(value.afterOpen.fieldCount, 14);
  assert.equal(value.afterOpen.inlineRow, true);
  assert.deepEqual(value.afterOpen.state, {
    open: true,
    owner: 'session-summary',
    sessionId: 'summary-session',
  });
  assert.equal(value.afterOpen.title, 'Summary check');
  assert.deepEqual(value.afterOpen.snapshot, value.before);

  assert.deepEqual(value.afterOutside.state, {
    open: false,
    owner: null,
    sessionId: null,
  });
  assert.equal(value.afterOutside.surfaceHidden, true);

  assert.deepEqual(value.afterEscape.state, {
    open: false,
    owner: null,
    sessionId: null,
  });
  assert.equal(value.afterEscape.activeAction, 'summary');
  assert.equal(value.afterEscape.surfaceHidden, true);
  assert.deepEqual(value.afterEscape.snapshot, value.before);

  assert.deepEqual(value.afterCloseButton.state, value.afterEscape.state);
  assert.equal(value.afterCloseButton.activeAction, 'summary');
  assert.deepEqual(value.afterCloseButton.snapshot, value.before);
} finally {
  await page.cleanup();
}

console.log('v6 session summary surface browser smoke passed');
