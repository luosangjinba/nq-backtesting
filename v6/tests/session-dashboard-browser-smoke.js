import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const root = document.querySelector('[data-v6-root]');
      const defaultState = {
        dashboardHidden: document.querySelector('[data-v6-session-dashboard]').hidden,
        dashboardOpen: root.__v6SessionDashboard.getState().open,
        surface: root.dataset.v6Surface || '',
        workstationHidden: document.querySelector('[data-v6-workstation-main]').hidden,
      };

      const openedState = {
        actionLabels: [...document.querySelectorAll('.session-dashboard-actions button')].map((button) => button.textContent.trim()),
        analyticsText: document.querySelector('[data-v6-dashboard-analytics]')?.textContent || '',
        dashboardHidden: document.querySelector('[data-v6-session-dashboard]').hidden,
        dashboardOpen: root.__v6SessionDashboard.getState().open,
        forwardExists: Boolean(document.querySelector('[data-v6-top-session-forward]')),
        primaryLabels: [
          document.querySelector('[data-v6-dashboard-create-session]')?.textContent.trim() || '',
          document.querySelector('.session-dashboard-list-section header strong')?.textContent.trim() || '',
          document.querySelector('[data-v6-dashboard-analytics] header')?.textContent.trim() || '',
        ],
        tabCount: document.querySelectorAll('.session-dashboard-tabs button').length,
        text: document.querySelector('[data-v6-session-dashboard]').textContent || '',
        surface: root.dataset.v6Surface,
        toggleExpanded: document.querySelector('[data-v6-dashboard-toggle]').getAttribute('aria-expanded'),
        transportHidden: document.querySelector('[data-v6-transport]').hidden,
        workstationHidden: document.querySelector('[data-v6-workstation-main]').hidden,
      };

      document.querySelector('[data-v6-dashboard-create-session]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
      const commandsModule = await import('/v6/src/runtime/commands.js');
      const afterCreate = {
        activeId: (await commandsModule.dispatchCommand('session.getActive'))?.id || '',
        dashboardHidden: document.querySelector('[data-v6-session-dashboard]').hidden,
        dashboardOpen: root.__v6SessionDashboard.getState().open,
        emptyHidden: document.querySelector('[data-v6-dashboard-empty]').hidden,
        rows: document.querySelectorAll('[data-v6-dashboard-session-row]').length,
        sessionCount: root.__v6SessionDashboard.getState().sessionCount,
        sessionId: root.__v6SessionDashboard.getState().sessions[0]?.id || '',
        sessionText: document.querySelector('[data-v6-dashboard-session-row]')?.textContent || '',
        surface: root.dataset.v6Surface,
        workstationHidden: document.querySelector('[data-v6-workstation-main]').hidden,
      };

      document.querySelector('[data-v6-dashboard-toggle]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      document.querySelector('[data-v6-dashboard-open-session]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const afterOpenSession = {
        activeId: (await commandsModule.dispatchCommand('session.getActive'))?.id || '',
        dashboardHidden: document.querySelector('[data-v6-session-dashboard]').hidden,
        dashboardOpen: root.__v6SessionDashboard.getState().open,
        surface: root.dataset.v6Surface,
        transportHidden: document.querySelector('[data-v6-transport]').hidden,
        workstationHidden: document.querySelector('[data-v6-workstation-main]').hidden,
      };

      document.querySelector('[data-v6-dashboard-toggle]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const afterReturnToSession = {
        dashboardHidden: document.querySelector('[data-v6-session-dashboard]').hidden,
        dashboardOpen: root.__v6SessionDashboard.getState().open,
        surface: root.dataset.v6Surface,
        workstationHidden: document.querySelector('[data-v6-workstation-main]').hidden,
      };

      return {
        afterCreate,
        afterOpenSession,
        afterReturnToSession,
        defaultState,
        mounted: Boolean(root.__v6SessionDashboard?.getState),
        openedState,
      };
    })()))()
  `));

  assert.equal(value.mounted, true);
  assert.deepEqual(value.defaultState, {
    dashboardHidden: false,
    dashboardOpen: true,
    surface: 'session',
    workstationHidden: true,
  });
  assert.equal(value.openedState.dashboardHidden, false);
  assert.equal(value.openedState.dashboardOpen, true);
  assert.equal(value.openedState.tabCount, 0);
  assert.deepEqual(value.openedState.primaryLabels, ['Backtesting session', 'Sessions', 'Analytics']);
  assert.deepEqual(value.openedState.actionLabels, ['Backtesting session']);
  assert.match(value.openedState.analyticsText, /replay orders/);
  assert.match(value.openedState.analyticsText, /live orders/);
  assert.equal(value.openedState.text.includes('Dashboard'), false);
  assert.equal(value.openedState.text.includes('Tutorials'), false);
  assert.equal(value.openedState.text.includes('Prop firm'), false);
  assert.equal(value.openedState.forwardExists, false);
  assert.equal(value.openedState.surface, 'session');
  assert.equal(value.openedState.toggleExpanded, 'true');
  assert.equal(value.openedState.transportHidden, true);
  assert.equal(value.openedState.workstationHidden, true);
  assert.equal(value.afterCreate.dashboardHidden, true);
  assert.equal(value.afterCreate.dashboardOpen, false);
  assert.equal(value.afterCreate.emptyHidden, true);
  assert.equal(value.afterCreate.rows, 1);
  assert.equal(value.afterCreate.sessionCount, 1);
  assert.equal(value.afterCreate.activeId, value.afterCreate.sessionId);
  assert.equal(value.afterCreate.surface, 'workstation');
  assert.equal(value.afterCreate.workstationHidden, false);
  assert.match(value.afterCreate.sessionText, /NQ 1m/);
  assert.equal(value.afterOpenSession.dashboardHidden, true);
  assert.equal(value.afterOpenSession.dashboardOpen, false);
  assert.equal(value.afterOpenSession.activeId, value.afterCreate.sessionId);
  assert.equal(value.afterOpenSession.surface, 'workstation');
  assert.equal(value.afterOpenSession.transportHidden, false);
  assert.equal(value.afterOpenSession.workstationHidden, false);
  assert.equal(value.afterReturnToSession.dashboardHidden, false);
  assert.equal(value.afterReturnToSession.dashboardOpen, true);
  assert.equal(value.afterReturnToSession.surface, 'session');
  assert.equal(value.afterReturnToSession.workstationHidden, true);
} finally {
  await page.cleanup();
}

console.log('v6 session dashboard browser smoke passed');
