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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9466);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v6-app-shell-browser-smoke-${process.pid}`;

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
  const webPort = Number(process.env.V6_WEB_PORT || await getFreePort());
  const pageUrl = process.env.V6_PAGE_URL || `http://127.0.0.1:${webPort}/v6/index.html`;
  const web = spawn('python3', [
    '-m',
    'http.server',
    String(webPort),
    '--bind',
    '127.0.0.1',
  ], { cwd: process.cwd(), stdio: 'ignore' });

  let client = null;
  let chrome = null;
  try {
    await waitForHttpOk(pageUrl);
    chrome = spawn(CHROME_BIN, [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1440,900',
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${PROFILE_DIR}`,
      pageUrl,
    ], { stdio: 'ignore' });

    const target = await waitForTargets(DEBUG_PORT);
    client = createCdpClient(target.webSocketDebuggerUrl);
    await client.open();
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Page.navigate', { url: pageUrl });
    await waitForExpression(client, `document.querySelector('[data-v6-root]')?.dataset.booted === 'true'`, 8_000);

    const value = JSON.parse(await evaluate(client, `
      JSON.stringify({
        title: document.title,
        booted: document.querySelector('[data-v6-root]')?.dataset.booted || '',
        hasShell: Boolean(document.querySelector('[data-v6-workstation-shell]')),
        headerText: document.querySelector('.top-bar h1')?.textContent || '',
        transportText: document.querySelector('.transport-placeholder')?.textContent || '',
        registryRunning: Boolean(document.querySelector('[data-v6-root]')?.__v6RuntimeRegistry?.snapshot?.().running),
      })
    `));

    assert.equal(value.title, 'V6 FX Replay');
    assert.equal(value.booted, 'true');
    assert.equal(value.hasShell, true);
    assert.equal(value.headerText, 'FX Session Replay');
    assert.match(value.transportText, /Play/);
    assert.equal(value.registryRunning, true);
  } finally {
    if (client) {
      try {
        client.close();
      } catch {
        // Cleanup best effort.
      }
    }
    chrome?.kill('SIGTERM');
    web.kill('SIGTERM');
    if (chrome) await waitForProcessExit(chrome).catch(() => {});
    await waitForProcessExit(web).catch(() => {});
    await rm(PROFILE_DIR, { recursive: true, force: true }).catch(() => {});
  }
}

await main();

console.log('v6 app shell browser smoke passed');
