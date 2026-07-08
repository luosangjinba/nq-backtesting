import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import http from 'node:http';
import {
  createCdpClient,
  waitForExpression,
  waitForProcessExit,
  waitForTargets,
} from '../../../v4/tests/helpers/browser-cdp-client.js';

const CHROME_BIN = process.env.CHROME_BIN || 'google-chrome';

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

export async function openV6Page({
  height = 900,
  pagePath = '/v6/index.html',
  readyExpression = `document.querySelector('[data-v6-root]')?.dataset.booted === 'true'`,
  width = 1440,
} = {}) {
  const webPort = Number(process.env.V6_WEB_PORT || await getFreePort());
  const debugPort = Number(process.env.CHROME_DEBUG_PORT || await getFreePort());
  const profileDir = process.env.CHROME_PROFILE_DIR || `/tmp/v6-browser-smoke-${process.pid}-${debugPort}`;
  const pageUrl = process.env.V6_PAGE_URL || `http://127.0.0.1:${webPort}${pagePath}`;
  const web = spawn('python3', [
    '-m',
    'http.server',
    String(webPort),
    '--bind',
    '127.0.0.1',
  ], { cwd: process.cwd(), stdio: 'ignore' });

  let client = null;
  let chrome = null;
  let cleanedUp = false;

  async function cleanup() {
    if (cleanedUp) return;
    cleanedUp = true;
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
    await rm(profileDir, { recursive: true, force: true }).catch(() => {});
  }

  try {
    await waitForHttpOk(pageUrl);
    chrome = spawn(CHROME_BIN, [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      `--window-size=${width},${height}`,
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profileDir}`,
      pageUrl,
    ], { stdio: 'ignore' });

    const target = await waitForTargets(debugPort);
    client = createCdpClient(target.webSocketDebuggerUrl);
    await client.open();
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Page.navigate', { url: pageUrl });
    await waitForExpression(client, readyExpression, 8_000);

    return {
      client,
      cleanup,
      debugPort,
      pageUrl,
      profileDir,
      webPort,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
