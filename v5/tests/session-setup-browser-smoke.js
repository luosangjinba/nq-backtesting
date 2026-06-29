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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9366);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-session-setup-browser-smoke-${process.pid}`;

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
    await waitForExpression(client, `Boolean(document.querySelector('[data-session-setup-form]'))`, 8_000);

    const value = JSON.parse(await evaluate(client, `
      (async () => {
        const form = document.querySelector('[data-session-setup-form]');
        form.querySelector('[name="instrument"]').value = 'NQ';
        form.querySelector('[name="timeframe"]').value = '1';
        form.querySelector('[name="sessionStart"]').value = '2026-06-01T09:30';
        form.querySelector('[name="sessionEnd"]').value = '2026-06-05T16:00';
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        const deadline = Date.now() + 8_000;
        while (!document.querySelector('[data-route="chart"]') && Date.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        const chart = document.querySelector('[data-route="chart"]');
        return JSON.stringify({
          route: chart?.dataset.route || '',
          sessionId: chart?.dataset.sessionId || '',
          hasChartRuntime: Boolean(window.chartRuntime),
          hasBarsRuntime: Boolean(window.barDataRuntime),
          hasReplayRuntime: Boolean(window.replayRuntime),
          text: chart?.textContent || '',
        });
      })()
    `));

    assert.equal(value.route, 'chart');
    assert.match(value.sessionId, /^session-/);
    assert.equal(value.hasChartRuntime, false);
    assert.equal(value.hasBarsRuntime, false);
    assert.equal(value.hasReplayRuntime, false);
    assert.match(value.text, /Chart runtime starts in Step 361/);
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
  () => console.log('v5 session setup browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
