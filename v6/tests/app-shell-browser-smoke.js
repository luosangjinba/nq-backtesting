import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

async function main() {
  const page = await openV6Page();
  try {
    const value = JSON.parse(await evaluate(page.client, `
      (async () => {
        const commandsModule = await import('/v6/src/runtime/commands.js');
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
        readinessInHeader: Boolean(document.querySelector('[data-v6-workstation-header] [data-v6-readiness-surface]')),
        standaloneReadiness: Boolean(document.querySelector('[data-v6-workstation-shell] > [data-v6-readiness-surface]')),
        readinessState: document.querySelector('[data-v6-readiness-state]')?.textContent || '',
        readinessDetail: document.querySelector('[data-v6-readiness-missing]')?.textContent || '',
        readinessRuntimeCount: document.querySelector('[data-v6-readiness-runtime-count]')?.textContent || '',
        readinessCommandCount: document.querySelector('[data-v6-readiness-command-count]')?.textContent || '',
        readinessGateCount: document.querySelector('[data-v6-readiness-gate-count]')?.textContent || '',
        readinessGateItems: document.querySelectorAll('[data-v6-readiness-gate]').length,
        panelTitles: [...document.querySelectorAll('.panel-copy strong, .settings-modal-header strong')].map((element) => element.textContent),
        bodyText: document.body.textContent || '',
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
    assert.equal(value.transportMounted, true);
    assert.equal(value.replayWorkflowMounted, true);
    assert.equal(value.journalMounted, true);
    assert.equal(value.sessionsMounted, true);
    assert.equal(value.readinessMounted, true);
    assert.equal(value.readinessInHeader, true);
    assert.equal(value.standaloneReadiness, false);
    assert.equal(value.readinessState, 'System ready');
    assert.equal(value.readinessDetail, 'Replay workstation is ready');
    assert.match(value.readinessRuntimeCount, /services active/);
    assert.equal(value.readinessCommandCount, 'Commands ready');
    assert.equal(value.readinessGateCount, 'Core checks passed');
    assert.equal(value.readinessGateItems, 0);
    assert.deepEqual(value.panelTitles, [
      'Trade Journal',
      'Replay Control',
      'Replay Sessions',
      'Settings',
    ]);
    assert.equal(value.bodyText.includes('boundary-smoke.js'), false);
    assert.equal(value.bodyText.includes('Cache-hit latency'), false);
    assert.equal(value.bodyText.includes('mixed-timeframe-visible-latency-browser-smoke.js'), false);
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

    const sessionFlow = JSON.parse(await evaluate(page.client, `
      (async () => {
        const root = document.querySelector('[data-v6-root]');
        document.querySelector('[data-v6-sessions-toggle]').click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        document.querySelector('[data-v6-sessions-create]').click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        await new Promise((resolve) => setTimeout(resolve, 0));
        return JSON.stringify({
          open: root.__v6SessionsSurface.getState().open,
          count: root.__v6SessionsSurface.getState().count,
          activeText: document.querySelector('[data-v6-sessions-active]')?.textContent || '',
          countText: document.querySelector('[data-v6-sessions-count]')?.textContent || '',
          rows: document.querySelectorAll('[data-v6-session-row]').length,
        });
      })()
    `));
    assert.equal(sessionFlow.open, true);
    assert.equal(sessionFlow.count, 1);
    assert.equal(sessionFlow.countText, '1 replay sessions');
    assert.match(sessionFlow.activeText, /NQ 1m/);
    assert.equal(sessionFlow.rows, 1);

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
    assert.equal(replayWorkflow.loaded, false);
    assert.equal(replayWorkflow.replayText, 'No replay loaded');
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
