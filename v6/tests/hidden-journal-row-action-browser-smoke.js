import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const browserDoc = await readFile('v6/docs/V6_HIDDEN_JOURNAL_ROW_ACTION_BROWSER_HARNESS.md', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');

assert.equal(indexDoc.includes('V6_HIDDEN_JOURNAL_ROW_ACTION_BROWSER_HARNESS.md'), true);
assert.match(browserDoc, /dashboard Journal row action remains hidden/);
assert.match(browserDoc, /Recent Sessions still renders only Summary, Stats, and Copy/);
assert.match(browserDoc, /Step 114 should audit whether the hidden browser harness is enough/);

const page = await openV6Page({ height: 820, width: 1360 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      localStorage.removeItem('v6.sessions.metadata');
      const root = document.querySelector('[data-v6-root]');
      document.querySelector('[data-v6-session-setup-name]').value = 'Hidden journal browser';
      document.querySelector('[data-v6-session-setup-start]').value = '2026-06-01T09:30';
      document.querySelector('[data-v6-session-setup-end]').value = '2026-06-05T16:00';
      document.querySelector('[data-v6-dashboard-create-session]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));

      const rowActionsBefore = [...document.querySelectorAll('[data-v6-row-action]')]
        .map((button) => button.dataset.v6RowAction);
      const session = root.__v6SessionDashboard.getState().sessions[0];
      const { createHiddenJournalRowActionHarness } = await import('/v6/src/journal/journal-row-action-hidden-harness.js');
      const { createJournalRowActionSessionContext } = await import('/v6/src/journal/journal-row-action-session-context.js');
      const openedContexts = [];
      const refreshedContexts = [];
      const harness = createHiddenJournalRowActionHarness({
        createContext: createJournalRowActionSessionContext,
        openSurface: (context) => {
          openedContexts.push(context);
          root.__v6JournalSurface.setOpen(true);
        },
        refreshSurface: async (context) => {
          refreshedContexts.push(context);
          await root.__v6JournalSurface.refresh();
        },
      });

      const result = await harness.open({
        ...session,
        bars: [{ time: 1 }],
        calendarEvents: [{ title: 'Blocked calendar' }],
        chartState: { paneId: 'main' },
        journalEntries: [{ id: 'blocked-journal' }],
        orders: [{ id: 'blocked-order' }],
        replayState: { revealedCount: 1 },
        viewportState: { range: true },
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      const rowActionsAfter = [...document.querySelectorAll('[data-v6-row-action]')]
        .map((button) => button.dataset.v6RowAction);
      const blockedFields = [
        'bars',
        'calendarEvents',
        'chartState',
        'journalEntries',
        'orders',
        'replayState',
        'viewportState',
      ];

      return {
        blockedPresent: blockedFields.filter((field) => Object.hasOwn(result.context, field)),
        context: result.context,
        dashboardSurface: root.dataset.v6Surface || '',
        journalOpen: root.__v6JournalSurface.getState().open,
        openedCount: openedContexts.length,
        openedContext: openedContexts[0],
        refreshed: result.refreshed,
        refreshedCount: refreshedContexts.length,
        rowActionsAfter,
        rowActionsBefore,
        rowActionVisible: result.rowActionVisible,
        visibleJournalRows: document.querySelectorAll('[data-v6-row-action]').length,
      };
    })()))()
  `));

  assert.deepEqual(value.rowActionsBefore, ['summary', 'analytics', 'copy']);
  assert.deepEqual(value.rowActionsAfter, ['summary', 'analytics', 'copy']);
  assert.equal(value.rowActionsAfter.includes('journal'), false);
  assert.equal(value.visibleJournalRows, 3);
  assert.equal(value.dashboardSurface, 'workstation');
  assert.equal(value.context.sessionId.length > 0, true);
  assert.equal(value.context.source, 'recent-session-row');
  assert.equal(value.context.name, 'Hidden journal browser');
  assert.deepEqual(value.blockedPresent, []);
  assert.equal(value.journalOpen, true);
  assert.equal(value.openedCount, 1);
  assert.deepEqual(value.openedContext, value.context);
  assert.equal(value.refreshed, true);
  assert.equal(value.refreshedCount, 1);
  assert.equal(value.rowActionVisible, false);
} finally {
  await page.cleanup();
}

console.log('v6 hidden journal row action browser smoke passed');
