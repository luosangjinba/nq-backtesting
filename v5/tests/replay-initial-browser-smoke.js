import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import http from 'node:http';
import {
  createCdpClient,
  evaluate,
  waitForExpression,
  waitForProcessExit,
  waitForTargets,
} from '../../v4/tests/helpers/browser-cdp-client.js';

const CHROME_BIN = process.env.CHROME_BIN || 'google-chrome';
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9367);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-replay-initial-browser-smoke-${process.pid}`;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
    server.on('error', reject);
  });
}

function waitForHttpOk(url, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode >= 200 && response.statusCode < 400) {
          resolve();
          return;
        }
        retry();
      });
      request.on('error', retry);
    };
    const retry = () => {
      if (Date.now() > deadline) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      setTimeout(attempt, 100);
    };
    attempt();
  });
}

async function main() {
  const webPort = Number(process.env.V5_WEB_PORT || await getFreePort());
  const pageUrl = process.env.V5_PAGE_URL || `http://127.0.0.1:${webPort}/v5/index.html`;
  const web = spawn('python3', [
    '-m',
    'http.server',
    String(webPort),
    '--bind',
    '127.0.0.1',
  ], { cwd: process.cwd(), stdio: 'ignore' });
  await waitForHttpOk(pageUrl);

  const chrome = spawn(CHROME_BIN, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${PROFILE_DIR}`,
    pageUrl,
  ], { stdio: 'ignore' });

  let client = null;
  try {
    const target = await waitForTargets(DEBUG_PORT);
    client = createCdpClient(target.webSocketDebuggerUrl);
    await client.open();
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Page.navigate', { url: pageUrl });
    await waitForExpression(client, `document.querySelector('[data-v5-root]')?.dataset.booted === 'true'`, 8_000);

    const value = JSON.parse(await evaluate(client, `
      (async () => {
        const originalFetch = window.fetch.bind(window);
        const barsRequests = [];
        window.fetch = async (...args) => {
          const url = String(args[0] || '');
          if (url.includes('/v4/bars')) barsRequests.push(url);
          return originalFetch(...args);
        };
        try {
          const commands = await import('/v5/src/runtime/commands.js');
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-real-data-initial',
            instrument: 'NQ',
            timeframe: 1,
            sessionStart: '2025-06-02T10:00:00.000Z',
            sessionEnd: '2025-06-02T10:30:00.000Z',
          });
          await commands.dispatchCommand('app.navigate', {
            routeId: 'chart',
            params: { sessionId: created.session.id },
          });

          const deadline = Date.now() + 12_000;
          while (Date.now() < deadline) {
            const state = await commands.dispatchCommand('replay.getState');
            if (state.status === 'initial-loaded') break;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          const state = await commands.dispatchCommand('replay.getState');
          const displayBars = state.displayBars || [];
          const startTimestamp = Number(state.startBar?.timestamp);
          const chartCount = Number(document.querySelector('[data-chart-bar-count]')?.dataset.chartBarCount || 0);
          const parsedRequests = barsRequests.map((url) => {
            const parsed = new URL(url, window.location.href);
            return {
              start: parsed.searchParams.get('start'),
              end: parsed.searchParams.get('end'),
              tf: parsed.searchParams.get('tf'),
              instrument: parsed.searchParams.get('instrument'),
            };
          });
          return JSON.stringify({
            error: '',
            status: state.status,
            displayCount: displayBars.length,
            chartCount,
            startTimestamp,
            latestTimestamp: Number(displayBars.at(-1)?.timestamp),
            prefixCount: displayBars.filter((bar) => Number(bar.timestamp) < startTimestamp).length,
            futureCount: displayBars.filter((bar) => Number(bar.timestamp) > startTimestamp).length,
            requests: parsedRequests,
            statusText: document.querySelector('[data-replay-load-status]')?.textContent || '',
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        } finally {
          window.fetch = originalFetch;
        }
      })()
    `));

    assert.equal(value.error, '', value.error || 'browser smoke failed');
    assert.equal(value.status, 'initial-loaded');
    assert.ok(value.displayCount > 1, 'initial replay should display prefix plus start');
    assert.equal(value.chartCount, value.displayCount);
    assert.ok(value.prefixCount > 0, 'initial replay should include prefix bars');
    assert.equal(value.futureCount, 0, 'initial replay should not display future bars');
    assert.equal(value.latestTimestamp, value.startTimestamp, 'latest visible replay bar should be start');
    assert.equal(value.requests.length, 2, 'initial replay should request start resolve and prefix only');
    assert.equal(value.requests.every((request) => request.instrument === 'NQ'), true);
    assert.equal(value.requests.every((request) => request.tf === '1'), true);
    assert.equal(value.requests.some((request) =>
      request.start === '2025-06-02 10:00' && request.end === '2025-06-02 10:30'
    ), false, 'initial replay must not request the full session range');
    assert.match(value.statusText, /^Loaded \d+ bars\.$/);
  } finally {
    client?.close();
    chrome.kill('SIGTERM');
    await waitForProcessExit(chrome);
    web.kill('SIGTERM');
    await waitForProcessExit(web);
    await rm(PROFILE_DIR, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    }).catch(() => {});
  }
}

main().then(
  () => console.log('v5 replay initial browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
