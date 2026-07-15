import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

async function main() {
  const page = await openV6Page();
  try {
    const value = JSON.parse(await evaluate(page.client, `
      (async () => {
        const commandsModule = await import('/v6/src/runtime/commands.js');
        const visibleText = (node) => {
          if (!node) return '';
          const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
            acceptNode(textNode) {
              const parent = textNode.parentElement;
              if (!parent) return NodeFilter.FILTER_REJECT;
              if (parent.closest('[hidden], [aria-hidden="true"]')) return NodeFilter.FILTER_REJECT;
              const style = getComputedStyle(parent);
              if (style.display === 'none' || style.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
              return NodeFilter.FILTER_ACCEPT;
            },
          });
          const parts = [];
          while (walker.nextNode()) {
            const text = walker.currentNode.nodeValue.trim();
            if (text) parts.push(text);
          }
          return parts.join(' ');
        };
        return JSON.stringify({
        title: document.title,
        booted: document.querySelector('[data-v6-root]')?.dataset.booted || '',
        commands: commandsModule.listCommands(),
        hasShell: Boolean(document.querySelector('[data-v6-workstation-shell]')),
        headerText: document.querySelector('.top-bar h1')?.textContent || '',
        transportText: document.querySelector('.transport-placeholder')?.textContent || '',
        transportMounted: Boolean(document.querySelector('[data-v6-root]')?.__v6ReplayTransport?.getState),
        replayWorkflowMounted: Boolean(document.querySelector('[data-v6-root]')?.__v6ReplayWorkflowSurface?.getState),
        journalMounted: Boolean(document.querySelector('[data-v6-root]')?.__v6JournalSurface?.getState),
        sessionsMounted: Boolean(document.querySelector('[data-v6-root]')?.__v6SessionsSurface?.getState),
        readinessMounted: Boolean(document.querySelector('[data-v6-root]')?.__v6ReadinessSurface?.getState),
        sessionDashboardMounted: Boolean(document.querySelector('[data-v6-root]')?.__v6SessionDashboard?.getState),
        readinessInHeader: Boolean(document.querySelector('[data-v6-workstation-header] [data-v6-readiness-surface]')),
        readinessHidden: document.querySelector('[data-v6-readiness-surface]')?.hidden ?? false,
        standaloneReadiness: Boolean(document.querySelector('[data-v6-workstation-shell] > [data-v6-readiness-surface]')),
        readinessState: document.querySelector('[data-v6-readiness-state]')?.textContent || '',
        readinessDetail: document.querySelector('[data-v6-readiness-missing]')?.textContent || '',
        readinessRuntimeCount: document.querySelector('[data-v6-readiness-runtime-count]')?.textContent || '',
        readinessRuntimeCountHidden: document.querySelector('[data-v6-readiness-runtime-count]')?.hidden ?? false,
        readinessRuntimeCountAriaHidden: document.querySelector('[data-v6-readiness-runtime-count]')?.getAttribute('aria-hidden') || '',
        readinessCommandCount: document.querySelector('[data-v6-readiness-command-count]')?.textContent || '',
        readinessCommandCountHidden: document.querySelector('[data-v6-readiness-command-count]')?.hidden ?? false,
        readinessCommandCountAriaHidden: document.querySelector('[data-v6-readiness-command-count]')?.getAttribute('aria-hidden') || '',
        readinessGateCount: document.querySelector('[data-v6-readiness-gate-count]')?.textContent || '',
        readinessGateCountHidden: document.querySelector('[data-v6-readiness-gate-count]')?.hidden ?? false,
        readinessGateCountAriaHidden: document.querySelector('[data-v6-readiness-gate-count]')?.getAttribute('aria-hidden') || '',
        readinessGateItems: document.querySelectorAll('[data-v6-readiness-gate]').length,
        readinessGatesHidden: document.querySelector('[data-v6-readiness-gates]')?.hidden ?? false,
        panelTitles: [...document.querySelectorAll('.panel-copy strong, .settings-modal-header strong')].map((element) => element.textContent),
        bodyText: document.body.textContent || '',
        visibleBodyText: visibleText(document.body),
        registrySnapshot: document.querySelector('[data-v6-root]')?.__v6RuntimeRegistry?.snapshot?.(),
        playDisabled: document.querySelector('[data-v6-transport-action="play-toggle"]')?.disabled ?? true,
        nextDisabled: document.querySelector('[data-v6-transport-action="next"]')?.disabled ?? true,
        speedSliderMounted: Boolean(document.querySelector('[data-v6-transport-speed-slider]')),
        periodMenuMounted: Boolean(document.querySelector('[data-v6-transport-period-menu]')),
        syncToggleMounted: Boolean(document.querySelector('[data-v6-transport-period-sync]')),
        });
      })()
    `));

    assert.equal(value.title, 'V6 FX Replay');
    assert.equal(value.booted, 'true');
    assert.equal(value.hasShell, true);
    assert.equal(value.headerText, 'FX Session Replay');
    assert.match(value.transportText, /Play/);
    assert.equal(value.registrySnapshot.running, true);
    assert.equal(value.registrySnapshot.started.includes('runtime.settings'), true);
    assert.equal(value.registrySnapshot.started.includes('runtime.persistence'), true);
    assert.equal(value.registrySnapshot.started.includes('runtime.journal'), true);
    assert.equal(value.registrySnapshot.started.includes('runtime.journalPersistence'), true);
    assert.equal(value.registrySnapshot.started.includes('runtime.layout'), true);
    assert.equal(value.registrySnapshot.started.includes('runtime.chartEntry'), true);
    assert.equal(value.registrySnapshot.started.includes('runtime.chartEntryInitialization'), true);
    assert.equal(value.registrySnapshot.started.includes('runtime.chartEntryContext'), true);
    assert.equal(value.registrySnapshot.started.includes('runtime.chartEntryReplayBootstrap'), true);
    assert.equal(value.registrySnapshot.started.includes('runtime.chartEntryDefaultWallPlan'), true);
    assert.equal(value.registrySnapshot.started.includes('runtime.chartEntryProjectionPreparation'), true);
    assert.equal(value.registrySnapshot.started.includes('runtime.chartEntryProjectionApply'), true);
    assert.equal(value.registrySnapshot.started.includes('runtime.replay-navigation-preferences'), true);
    assert.equal(value.transportMounted, true);
    assert.equal(value.replayWorkflowMounted, true);
    assert.equal(value.journalMounted, true);
    assert.equal(value.sessionsMounted, true);
    assert.equal(value.readinessMounted, true);
    assert.equal(value.sessionDashboardMounted, true);
    assert.equal(value.readinessInHeader, true);
    assert.equal(value.readinessHidden, true);
    assert.equal(value.standaloneReadiness, false);
    assert.equal(value.readinessState, 'System ready');
    assert.equal(value.readinessDetail, 'Replay workstation is ready');
    assert.match(value.readinessRuntimeCount, /services active/);
    assert.equal(value.readinessRuntimeCountHidden, true);
    assert.equal(value.readinessRuntimeCountAriaHidden, 'true');
    assert.equal(value.readinessCommandCount, 'Commands ready');
    assert.equal(value.readinessCommandCountHidden, true);
    assert.equal(value.readinessCommandCountAriaHidden, 'true');
    assert.equal(value.readinessGateCount, 'Core checks passed');
    assert.equal(value.readinessGateCountHidden, true);
    assert.equal(value.readinessGateCountAriaHidden, 'true');
    assert.equal(value.readinessGateItems, 0);
    assert.equal(value.readinessGatesHidden, true);
    assert.equal(value.visibleBodyText.includes('System ready'), false);
    assert.deepEqual(value.panelTitles, [
      'Trade Journal',
      'Replay Control',
      'Replay Sessions',
      'Settings',
    ]);
    assert.equal(value.bodyText.includes('boundary-smoke.js'), false);
    assert.equal(value.bodyText.includes('Cache-hit latency'), false);
    assert.equal(value.bodyText.includes('mixed-timeframe-visible-latency-browser-smoke.js'), false);
    assert.equal(value.visibleBodyText.includes('services active'), false);
    assert.equal(value.visibleBodyText.includes('Commands ready'), false);
    assert.equal(value.visibleBodyText.includes('Core checks passed'), false);
    assert.equal(value.playDisabled, false);
    assert.equal(value.nextDisabled, false);
    assert.equal(value.speedSliderMounted, true);
    assert.equal(value.periodMenuMounted, true);
    assert.equal(value.syncToggleMounted, true);
    assert.equal(value.commands.includes('defaultWall.load'), true);
    assert.equal(value.commands.includes('defaultWall.next'), true);
    assert.equal(value.commands.includes('layout.getSnapshot'), true);
    assert.equal(value.commands.includes('settings.getSnapshot'), true);
    assert.equal(value.commands.includes('persistence.saveRecord'), true);
    assert.equal(value.commands.includes('journal.addEntry'), true);
    assert.equal(value.commands.includes('journal.analyzeRecords'), true);
    assert.equal(value.commands.includes('journalPersistence.saveSnapshot'), true);
    assert.equal(value.commands.includes('journalPersistence.loadSnapshot'), true);
    assert.equal(value.commands.includes('replayNavigationPreferences.getSnapshot'), true);
    assert.equal(value.commands.includes('replayNavigationPreferences.reset'), true);
    assert.equal(value.commands.includes('replayNavigationPreferences.update'), true);

    const sessionFlow = JSON.parse(await evaluate(page.client, `
      (async () => {
        const root = document.querySelector('[data-v6-root]');
        document.querySelector('[data-v6-dashboard-toggle]').click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        document.querySelector('[data-v6-dashboard-create-session]').click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        await new Promise((resolve) => setTimeout(resolve, 0));
        const commandsModule = await import('/v6/src/runtime/commands.js');
        const openState = root.__v6SessionDashboard.getState();
        const createdSessionId = openState.sessions[0]?.id || '';
        document.querySelector('[data-v6-dashboard-open-session]').click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        let contextState = await commandsModule.dispatchCommand('chartEntryContext.getState');
        const deadline = performance.now() + 3000;
        while (contextState.status === 'idle' && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          contextState = await commandsModule.dispatchCommand('chartEntryContext.getState');
        }
        let bootstrapState = await commandsModule.dispatchCommand('chartEntryReplayBootstrap.getState');
        while (bootstrapState.status === 'idle' && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          bootstrapState = await commandsModule.dispatchCommand('chartEntryReplayBootstrap.getState');
        }
        let wallPlanState = await commandsModule.dispatchCommand('chartEntryDefaultWallPlan.getState');
        while (wallPlanState.status === 'idle' && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          wallPlanState = await commandsModule.dispatchCommand('chartEntryDefaultWallPlan.getState');
        }
        let projectionPreparationState = await commandsModule.dispatchCommand('chartEntryProjectionPreparation.getState');
        while (projectionPreparationState.status === 'idle' && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          projectionPreparationState = await commandsModule.dispatchCommand('chartEntryProjectionPreparation.getState');
        }
        let projectionApplyState = await commandsModule.dispatchCommand('chartEntryProjectionApply.getState');
        while (projectionApplyState.status === 'idle' && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          projectionApplyState = await commandsModule.dispatchCommand('chartEntryProjectionApply.getState');
        }
        return JSON.stringify({
          activeSessionId: (await commandsModule.dispatchCommand('session.getActive'))?.id || '',
          activationState: await commandsModule.dispatchCommand('chartEntry.getState'),
          bootstrapState,
          chartDataSummary: await commandsModule.dispatchCommand('chartData.getSummary'),
          contextState,
          defaultWallState: await commandsModule.dispatchCommand('defaultWall.getState'),
          initializationState: await commandsModule.dispatchCommand('chartEntryInitialization.getState'),
          mainChartBars: await commandsModule.dispatchCommand('chartData.getBars', { paneId: 'main' }),
          projectionPreparationState,
          projectionApplyState,
          replayState: await commandsModule.dispatchCommand('replay.getState'),
          viewportPane: await commandsModule.dispatchCommand('chartViewport.getPane', { paneId: 'main' }),
          wallPlanState,
          closedSurface: root.dataset.v6Surface,
          count: openState.sessionCount,
          createdSessionId,
          dashboardOpenAfterReturn: root.__v6SessionDashboard.getState().open,
          openSurface: 'session',
          rows: document.querySelectorAll('[data-v6-dashboard-session-row]').length,
          workstationHiddenAfterReturn: document.querySelector('[data-v6-workstation-main]').hidden,
        });
      })()
    `));
    assert.equal(sessionFlow.openSurface, 'session');
    assert.equal(sessionFlow.closedSurface, 'workstation');
    assert.equal(sessionFlow.dashboardOpenAfterReturn, false);
    assert.equal(sessionFlow.workstationHiddenAfterReturn, false);
    assert.equal(sessionFlow.count, 1);
    assert.equal(sessionFlow.rows, 1);
    assert.equal(sessionFlow.activeSessionId, sessionFlow.createdSessionId);
    assert.equal(sessionFlow.activationState.activeSessionId, sessionFlow.createdSessionId);
    assert.equal(sessionFlow.activationState.status, 'planned');
    assert.equal(sessionFlow.activationState.initializationPlan.sessionId, sessionFlow.createdSessionId);
    assert.equal(sessionFlow.initializationState.status, 'planned');
    assert.equal(sessionFlow.initializationState.plan.sessionId, sessionFlow.createdSessionId);
    assert.equal(sessionFlow.initializationState.plan.plannedWindow.bounded, true);
    assert.equal(sessionFlow.contextState.status, 'loaded');
    assert.equal(sessionFlow.contextState.loaded.sessionId, sessionFlow.createdSessionId);
    assert.equal(sessionFlow.contextState.loaded.plannedWindow.bounded, true);
    assert.equal(sessionFlow.contextState.loaded.record.barCount > 0, true);
    assert.equal(sessionFlow.bootstrapState.status, 'loaded');
    assert.equal(sessionFlow.bootstrapState.loaded.sessionId, sessionFlow.createdSessionId);
    assert.equal(sessionFlow.bootstrapState.loaded.replayState.sessionId, sessionFlow.createdSessionId);
    assert.equal(sessionFlow.replayState.sessionId, sessionFlow.createdSessionId);
    assert.equal(sessionFlow.replayState.revealedCount, 1);
    assert.equal(sessionFlow.replayState.status, 'ready');
    assert.equal(sessionFlow.chartDataSummary.paneCount, 1);
    assert.equal(sessionFlow.chartDataSummary.panes[0].paneId, 'main');
    assert.equal(sessionFlow.chartDataSummary.panes[0].barCount > 0, true);
    assert.equal(sessionFlow.mainChartBars.bars.length, sessionFlow.chartDataSummary.panes[0].barCount);
    assert.equal(sessionFlow.mainChartBars.paneId, 'main');
    assert.equal(sessionFlow.viewportPane.paneId, 'main');
    assert.equal(Boolean(sessionFlow.viewportPane.projection), true);
    assert.equal(sessionFlow.defaultWallState, null);
    assert.equal(sessionFlow.wallPlanState.status, 'planned');
    assert.equal(sessionFlow.wallPlanState.plan.sessionId, sessionFlow.createdSessionId);
    assert.equal(sessionFlow.wallPlanState.plan.paneId, 'main');
    assert.equal(sessionFlow.wallPlanState.plan.prefixBars, 120);
    assert.equal(sessionFlow.wallPlanState.plan.spanBars, 80);
    assert.equal(sessionFlow.projectionPreparationState.status, 'prepared');
    assert.equal(sessionFlow.projectionPreparationState.prepared.sessionId, sessionFlow.createdSessionId);
    assert.equal(sessionFlow.projectionPreparationState.prepared.chartReplacePayload.paneId, 'main');
    assert.equal(sessionFlow.projectionPreparationState.prepared.chartReplacePayload.bars.length > 0, true);
    assert.equal(sessionFlow.projectionPreparationState.prepared.viewportIntentPayload.paneId, 'main');
    assert.equal(sessionFlow.projectionApplyState.status, 'applied');
    assert.equal(sessionFlow.projectionApplyState.applied.sessionId, sessionFlow.createdSessionId);
    assert.equal(sessionFlow.projectionApplyState.applied.chartRecord.paneId, 'main');
    assert.equal(sessionFlow.projectionApplyState.applied.viewportRecord.paneId, 'main');

    const replayWorkflow = JSON.parse(await evaluate(page.client, `
      (async () => {
        const root = document.querySelector('[data-v6-root]');
        document.querySelector('[data-v6-replay-workflow-toggle]').click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        document.querySelector('[data-v6-replay-workflow-refresh]').click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        await new Promise((resolve) => setTimeout(resolve, 0));
        return JSON.stringify({
          open: root.__v6ReplayWorkflowSurface.getState().open,
          loaded: root.__v6ReplayWorkflowSurface.getState().loaded,
          replayText: document.querySelector('[data-v6-replay-workflow-state]')?.textContent || '',
          wallText: document.querySelector('[data-v6-replay-workflow-wall]')?.textContent || '',
        });
      })()
    `));
    assert.equal(replayWorkflow.open, true);
    assert.equal(replayWorkflow.loaded, true);
    assert.equal(replayWorkflow.replayText, `ready at ${sessionFlow.replayState.cursorTime}`);
    assert.equal(replayWorkflow.wallText, 'No replay wall loaded');

    const journalFlow = JSON.parse(await evaluate(page.client, `
      (async () => {
        const root = document.querySelector('[data-v6-root]');
        document.querySelector('[data-v6-journal-toggle]').click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        document.querySelector('[data-v6-journal-add]').click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        await new Promise((resolve) => setTimeout(resolve, 0));
        document.querySelector('[data-v6-journal-save]').click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        await new Promise((resolve) => setTimeout(resolve, 0));
        document.querySelector('[data-v6-journal-load]').click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        await new Promise((resolve) => setTimeout(resolve, 0));
        return JSON.stringify({
          open: root.__v6JournalSurface.getState().open,
          count: root.__v6JournalSurface.getState().count,
          countText: document.querySelector('[data-v6-journal-count]')?.textContent || '',
          pnlText: document.querySelector('[data-v6-journal-pnl]')?.textContent || '',
          snapshotText: document.querySelector('[data-v6-journal-snapshot]')?.textContent || '',
          rows: document.querySelectorAll('[data-v6-journal-row]').length,
        });
      })()
    `));
    assert.equal(journalFlow.open, true);
    assert.equal(journalFlow.count, 1);
    assert.equal(journalFlow.countText, '1 journal entries');
    assert.equal(journalFlow.pnlText, 'Net P/L 1');
    assert.equal(journalFlow.snapshotText, 'Saved workstation-journal');
    assert.equal(journalFlow.rows, 1);
  } finally {
    await page.cleanup();
  }
}

await main();

console.log('v6 app shell browser smoke passed');
