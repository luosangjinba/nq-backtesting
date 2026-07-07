import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  evaluate,
  waitForExpression,
} from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const wiringDoc = await readFile('v6/docs/V6_JOURNAL_ROW_ACTION_VISIBILITY_WIRING.md', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');
const STORAGE_KEY = 'v6.sessions.metadata';
const session = {
  accountBalance: 100000,
  autoUpdateEndDate: false,
  createdAt: '2026-07-07T10:00:00.000Z',
  endTime: '2026-06-05T23:00:00.000Z',
  id: 'journal-visible-session',
  name: 'Visible journal row',
  profileId: 'default-profile',
  startTime: '2026-06-01T16:30:00.000Z',
  status: 'created',
  symbol: 'NQ',
  symbols: ['NQ'],
  timeframe: '1m',
  workspaceId: 'default-workspace',
};

assert.equal(indexDoc.includes('V6_JOURNAL_ROW_ACTION_VISIBILITY_WIRING.md'), true);
assert.match(wiringDoc, /Journal is visible in Recent Sessions/);
assert.match(wiringDoc, /dashboard does not dispatch Journal commands directly/);

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
      const root = document.querySelector('[data-v6-root]');
      const commands = await import('/v6/src/runtime/commands.js');
      const snapshot = async () => ({
        barCache: await commands.dispatchCommand('barData.getCacheSummary'),
        chartEntry: await commands.dispatchCommand('chartEntry.getState'),
        chartSummary: await commands.dispatchCommand('chartData.getSummary'),
        replay: await commands.dispatchCommand('replay.getState'),
      });

      const before = await snapshot();
      const rowActions = [...document.querySelectorAll('[data-v6-row-action]')]
        .map((button) => ({
          disabled: button.disabled,
          id: button.dataset.v6RowAction,
          owner: button.dataset.v6RowActionOwner,
        }));

      document.querySelector('[data-v6-row-action="journal"]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));

      const afterOpen = {
        snapshot: await snapshot(),
      };
      const journalState = root.__v6JournalSurface.getState();
      const rowActionState = root.__v6JournalRowAction.getState();

      return {
        afterOpen,
        before,
        journalOpen: journalState.open,
        journalRows: document.querySelectorAll('[data-v6-journal-row]').length,
        rowActions,
        rowActionState,
        surface: root.dataset.v6Surface || '',
      };
    })()))()
  `));

  assert.deepEqual(value.rowActions, [
    { disabled: false, id: 'summary', owner: 'session-summary' },
    { disabled: false, id: 'analytics', owner: 'session-analytics' },
    { disabled: false, id: 'copy', owner: 'session-repository' },
    { disabled: false, id: 'journal', owner: 'journal-runtime' },
  ]);
  assert.equal(value.surface, 'session');
  assert.equal(value.journalOpen, true);
  assert.equal(value.rowActionState.opened, true);
  assert.equal(value.rowActionState.refreshed, true);
  assert.equal(value.rowActionState.rowActionVisible, true);
  assert.equal(value.rowActionState.context.name, 'Visible journal row');
  assert.equal(value.rowActionState.context.source, 'recent-session-row');
  assert.deepEqual(value.afterOpen.snapshot, value.before);
  assert.equal(value.journalRows, 0);
} finally {
  await page.cleanup();
}

console.log('v6 session journal row action browser smoke passed');
