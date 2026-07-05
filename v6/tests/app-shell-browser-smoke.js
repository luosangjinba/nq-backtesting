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
    assert.equal(value.registrySnapshot.started.includes('runtime.layout'), true);
    assert.equal(value.transportMounted, true);
    assert.equal(value.playDisabled, false);
    assert.equal(value.nextDisabled, false);
    assert.equal(value.speedButtons, 4);
    assert.equal(value.commands.includes('defaultWall.load'), true);
    assert.equal(value.commands.includes('defaultWall.next'), true);
    assert.equal(value.commands.includes('layout.getSnapshot'), true);
  } finally {
    await page.cleanup();
  }
}

await main();

console.log('v6 app shell browser smoke passed');
