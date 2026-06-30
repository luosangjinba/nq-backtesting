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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9365);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-app-shell-browser-smoke-${process.pid}`;

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
    await waitForExpression(client, `document.readyState === 'complete' || document.readyState === 'interactive'`);
    await waitForExpression(client, `document.querySelector('[data-v5-root]')?.dataset.booted === 'true'`, 8_000);

    const value = JSON.parse(await evaluate(client, `
      (async () => {
        const root = document.querySelector('[data-v5-root]');
        const setup = document.querySelector('[data-route="setup"]');
        document.querySelector('[data-route-link="chart"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 100));
        const chart = document.querySelector('[data-route="chart"]');
        const currentRouteAfterChart = root?.dataset.currentRoute || '';
        const chartSetupLink = chart?.querySelector('[data-route-link="setup"]');
        const topBarDisplayOnChart = getComputedStyle(document.querySelector('.top-bar')).display;
        chartSetupLink?.click();
        await new Promise((resolve) => setTimeout(resolve, 100));
        const setupAgain = document.querySelector('[data-route="setup"]');
        const currentRouteAfterSetup = root?.dataset.currentRoute || '';
        const commands = await import('/v5/src/runtime/commands.js');
        const unsafeSessionId = '<img data-injected-session-id src=x>';
        await commands.dispatchCommand('app.navigate', {
          routeId: 'chart',
          params: { sessionId: unsafeSessionId },
        });
        await new Promise((resolve) => setTimeout(resolve, 100));
        const sessionIdLabel = document.querySelector('[data-session-id-label]');
        return JSON.stringify({
          booted: root?.dataset.booted || '',
          hasSetup: Boolean(setup),
          hasChartAfterClick: Boolean(chart),
          currentRouteAfterChart,
          hasChartSetupLink: Boolean(chartSetupLink),
          topBarDisplayOnChart,
          hasSetupAfterReturn: Boolean(setupAgain),
          currentRouteAfterSetup,
          escapedSessionId: sessionIdLabel?.textContent || '',
          injectedSessionNodeCount: document.querySelectorAll('[data-injected-session-id]').length,
          title: document.querySelector('h1')?.textContent?.trim() || '',
        });
      })()
    `));

    assert.equal(value.booted, 'true');
    assert.equal(value.hasSetup, true);
    assert.equal(value.hasChartAfterClick, true);
    assert.equal(value.currentRouteAfterChart, 'chart');
    assert.equal(value.hasChartSetupLink, true);
    assert.equal(value.topBarDisplayOnChart, 'none');
    assert.equal(value.hasSetupAfterReturn, true);
    assert.equal(value.currentRouteAfterSetup, 'setup');
    assert.equal(value.escapedSessionId, '<img data-injected-session-id src=x>');
    assert.equal(value.injectedSessionNodeCount, 0);
    assert.equal(value.title, 'FX Replay');
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
  () => console.log('v5 app shell browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
