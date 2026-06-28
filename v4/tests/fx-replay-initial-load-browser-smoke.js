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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9363);
const PAGE_URL = process.env.V4_PAGE_URL || 'http://127.0.0.1:8001/index.html';
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v4-fx-replay-initial-load-browser-smoke-profile-${process.pid}`;

async function runBrowserScenario(client) {
  const expression = `
    (async () => {
      const originalFetch = window.fetch.bind(window);
      const barsRequests = [];
      window.fetch = async (...args) => {
        const url = String(args[0] || '');
        if (url.includes('/v4/bars')) {
          barsRequests.push(url);
        }
        return originalFetch(...args);
      };
      try {
        const commands = await import('/src/runtime/commands.js');
        const chart = await import('/src/chart/chart-manager.js');
        const fxReplay = await import('/src/features/fx-replay/fx-replay-controller.js');
        const run = async (timeframe) => {
          barsRequests.length = 0;
          const result = await commands.executeCommand(commands.COMMANDS.START_FX_REPLAY_SESSION, {
            sessionId: 'browser-' + timeframe,
            instrument: 'NQ',
            timeframe,
            sessionStart: '2025-06-02 10:00',
            sessionEnd: '2025-06-30 16:00',
            viewport: {
              viewportWidthPx: 120,
              barSpacingPx: 6,
            },
            prefixBufferBars: 2,
            maxPrefixBars: 100,
          });
          const displayBars = result.displayBars || [];
          const maxTimestamp = Math.max(...displayBars.map((bar) => Number(bar.timestamp)));
          const minTimestamp = Math.min(...displayBars.map((bar) => Number(bar.timestamp)));
          const startTimestamp = Number(result.state.startBarTimestamp);
          const parsedRequests = barsRequests.map((url) => {
            const parsed = new URL(url, window.location.href);
            return {
              start: parsed.searchParams.get('start'),
              end: parsed.searchParams.get('end'),
              tf: parsed.searchParams.get('tf'),
              instrument: parsed.searchParams.get('instrument'),
            };
          });
          return {
            timeframe,
            displayCount: displayBars.length,
            activeDataCount: chart.getActiveDataCount(),
            startTimestamp,
            maxTimestamp,
            minTimestamp,
            futureVisible: displayBars.filter((bar) => Number(bar.timestamp) > startTimestamp).length,
            prefixCount: displayBars.filter((bar) => Number(bar.timestamp) < startTimestamp).length,
            latestIsStart: displayBars.at(-1)?.timestamp === startTimestamp,
            mode: result.payload.mode,
            activeSessionId: fxReplay.getActiveFxReplayState()?.sessionId || '',
            requests: parsedRequests,
          };
        };
        return JSON.stringify({
          error: '',
          oneMinute: await run(1),
          oneHour: await run(60),
        });
      } catch (error) {
        return JSON.stringify({ error: error?.stack || error?.message || String(error) });
      } finally {
        window.fetch = originalFetch;
      }
    })()
  `;
  return JSON.parse(await evaluate(client, expression));
}

function assertScenario(value, timeframe) {
  assert.equal(value.timeframe, timeframe);
  assert.equal(value.mode, 'fx-replay');
  assert.equal(value.activeSessionId, `browser-${timeframe}`);
  assert.ok(value.displayCount > 1, `${timeframe}m should display prefix + start`);
  assert.equal(value.activeDataCount, value.displayCount, `${timeframe}m chart data count should match display`);
  assert.ok(value.prefixCount > 0, `${timeframe}m should include prefix bars`);
  assert.equal(value.futureVisible, 0, `${timeframe}m should not show future bars`);
  assert.equal(value.latestIsStart, true, `${timeframe}m latest visible bar should be start`);
  assert.equal(value.maxTimestamp, value.startTimestamp, `${timeframe}m max timestamp should equal start`);
  assert.ok(value.minTimestamp < value.startTimestamp, `${timeframe}m prefix should be older than start`);
  assert.equal(value.requests.length, 2, `${timeframe}m should request start resolve and prefix only`);
  assert.equal(value.requests[0].tf, String(timeframe));
  assert.equal(value.requests[1].tf, String(timeframe));
  assert.equal(value.requests.some((request) =>
    request.start === '2025-06-02 10:00' && request.end === '2025-06-30 16:00'
  ), false, `${timeframe}m should not request the full selected range`);
}

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
    await waitForExpression(client, `Boolean(document.querySelector('#chart canvas'))`, 12_000);

    const value = await runBrowserScenario(client);
    assert.equal(value.error, '', value.error || 'browser smoke failed');
    assertScenario(value.oneMinute, 1);
    assertScenario(value.oneHour, 60);
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
  () => console.log('fx replay initial load browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
