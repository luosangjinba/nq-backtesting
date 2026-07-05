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
        sessionsMounted: Boolean(document.querySelector('[data-v6-root]')?.__v6SessionsSurface?.getState),
        readinessMounted: Boolean(document.querySelector('[data-v6-root]')?.__v6ReadinessSurface?.getState),
        readinessState: document.querySelector('[data-v6-readiness-state]')?.textContent || '',
        readinessRuntimeCount: document.querySelector('[data-v6-readiness-runtime-count]')?.textContent || '',
        readinessCommandCount: document.querySelector('[data-v6-readiness-command-count]')?.textContent || '',
        readinessGateCount: document.querySelector('[data-v6-readiness-gate-count]')?.textContent || '',
        readinessGateItems: document.querySelectorAll('[data-v6-readiness-gate]').length,
        registrySnapshot: document.querySelector('[data-v6-root]')?.__v6RuntimeRegistry?.snapshot?.(),
        playDisabled: document.querySelector('[data-v6-transport-action="play-toggle"]')?.disabled ?? true,
        nextDisabled: document.querySelector('[data-v6-transport-action="next"]')?.disabled ?? true,
        speedButtons: document.querySelectorAll('[data-v6-transport-speed]').length,
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
    assert.equal(value.sessionsMounted, true);
    assert.equal(value.readinessMounted, true);
    assert.equal(value.readinessState, 'Ready');
    assert.match(value.readinessRuntimeCount, /runtimes/);
    assert.match(value.readinessCommandCount, /commands/);
    assert.equal(value.readinessGateCount, '4 gates');
    assert.equal(value.readinessGateItems, 4);
    assert.equal(value.playDisabled, false);
    assert.equal(value.nextDisabled, false);
    assert.equal(value.speedButtons, 4);
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
    assert.equal(sessionFlow.countText, '1 sessions');
    assert.match(sessionFlow.activeText, /NQ 1m/);
    assert.equal(sessionFlow.rows, 1);
  } finally {
    await page.cleanup();
  }
}

await main();

console.log('v6 app shell browser smoke passed');
