import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import {
  createCdpClient,
  evaluate,
  waitForExpression,
  waitForProcessExit,
  waitForTargets,
} from './helpers/browser-cdp-client.js';

const CHROME_BIN = process.env.CHROME_BIN || 'google-chrome';
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9364);
const PAGE_URL = process.env.V4_PAGE_URL || 'http://127.0.0.1:8001/index.html';
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v4-fx-replay-toggle-browser-smoke-profile-${process.pid}`;

async function main() {
  const chrome = spawn(CHROME_BIN, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${PROFILE_DIR}`,
    PAGE_URL,
  ], { stdio: 'ignore' });

  let client = null;
  try {
    const target = await waitForTargets(DEBUG_PORT);
    client = createCdpClient(target.webSocketDebuggerUrl);
    await client.open();
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Page.navigate', { url: PAGE_URL });
    await waitForExpression(client, `document.readyState === 'complete' || document.readyState === 'interactive'`);
    await waitForExpression(client, `Boolean(document.querySelector('.replay-toggle'))`, 12_000);

    const value = JSON.parse(await evaluate(client, `
      (async () => {
        try {
          const commands = await import('/src/runtime/commands.js');
          const fxReplay = await import('/src/features/fx-replay/fx-replay-controller.js');
          const chart = await import('/src/chart/chart-manager.js');
          await commands.executeCommand(commands.COMMANDS.LOAD_PRIMARY_RANGE, {
            start: '2025-06-02 10:00',
            end: '2025-06-02 12:00',
            timeframe: 1,
            instrument: 'NQ',
          });
          await new Promise((resolve) => setTimeout(resolve, 250));
          document.querySelector('.replay-toggle')?.click();
          const deadline = Date.now() + 8_000;
          while (!fxReplay.getActiveFxReplayState() && Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          const state = fxReplay.getActiveFxReplayState();
          const display = state ? [...state.prefixBars, state.startBar].filter(Boolean) : [];
          return JSON.stringify({
            error: '',
            hasState: Boolean(state),
            activeDataCount: chart.getActiveDataCount(),
            startBarTimestamp: state?.startBarTimestamp || null,
            prefixCount: state?.prefixBars?.length || 0,
            displayCount: display.length,
            maxTimestamp: display.length ? Math.max(...display.map((bar) => Number(bar.timestamp))) : null,
            toggleText: document.querySelector('.replay-toggle')?.textContent?.trim() || '',
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        }
      })()
    `));

    assert.equal(value.error, '', value.error || 'toggle browser smoke failed');
    assert.equal(value.hasState, true);
    assert.ok(value.prefixCount > 0, 'toggle should load prefix bars');
    assert.equal(value.maxTimestamp, value.startBarTimestamp, 'toggle display should stop at start bar');
    assert.equal(value.activeDataCount, value.displayCount, 'chart data should match FX Replay display count');
    assert.match(value.toggleText, /Replay Bar On/);
  } finally {
    client?.close();
    chrome.kill('SIGTERM');
    await waitForProcessExit(chrome);
    await rm(PROFILE_DIR, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    }).catch(() => {});
  }
}

main().then(
  () => console.log('fx replay toggle browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
