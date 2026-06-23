import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import http from 'node:http';

const CHROME_BIN = process.env.CHROME_BIN || 'google-chrome';
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9374);
const HOST_URL = process.env.V4_HOST_URL || 'http://127.0.0.1:8001';
const INDEX_URL = `${HOST_URL}/index.html`;
const MAINTENANCE_URL = `${HOST_URL}/data-maintenance.html`;
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v4-remote-maintenance-responsive-${process.pid}`;

function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          return;
        }
        resolve(JSON.parse(body));
      });
    });
    req.on('error', reject);
    req.setTimeout(500, () => req.destroy(new Error('timeout')));
  });
}

async function waitForTarget() {
  const deadline = Date.now() + 10_000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const targets = await getJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
      if (page) return page;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw lastError || new Error('Chrome target not available');
}

function createCdpClient(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  let nextId = 1;
  const pending = new Map();

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) {
      reject(new Error(message.error.message || 'CDP error'));
      return;
    }
    resolve(message.result);
  });

  return {
    open() {
      return new Promise((resolve, reject) => {
        socket.addEventListener('open', resolve, { once: true });
        socket.addEventListener('error', reject, { once: true });
      });
    },
    send(method, params = {}) {
      const id = nextId;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
      });
    },
    close() {
      socket.close();
    },
  };
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    const detail =
      result.exceptionDetails.exception?.description ||
      result.exceptionDetails.exception?.value ||
      result.exceptionDetails.text ||
      'Runtime.evaluate failed';
    throw new Error(detail);
  }
  return result.result.value;
}

async function waitForExpression(client, expression, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  let lastValue = null;
  while (Date.now() < deadline) {
    lastValue = await evaluate(client, expression);
    if (lastValue) return lastValue;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for expression: ${expression}; last value: ${lastValue}`);
}

function waitForProcessExit(child, timeoutMs = 2_000) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, timeoutMs);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function navigate(client, url, width, height) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await client.send('Page.navigate', { url });
  await waitForExpression(client, `document.readyState === 'complete' || document.readyState === 'interactive'`);
}

async function main() {
  const chrome = spawn(CHROME_BIN, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${PROFILE_DIR}`,
    INDEX_URL,
  ], { stdio: 'ignore' });

  let client = null;
  try {
    const target = await waitForTarget();
    client = createCdpClient(target.webSocketDebuggerUrl);
    await client.open();
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });

    await navigate(client, INDEX_URL, 1366, 768);
    const indexResult = await evaluate(client, `
      (async () => {
        window.__remoteSmokeFetchUrls = [];
        const nativeFetch = window.fetch.bind(window);
        window.fetch = (...args) => {
          window.__remoteSmokeFetchUrls.push(String(args[0]));
          return nativeFetch(...args);
        };
        const api = await import('/src/api.js?remoteSmoke=' + Date.now());
        const bars = await api.fetchBars('2026-06-19 00:00', '2026-06-19 03:00', 60, 'NQ');
        return {
          href: window.location.href,
          host: window.location.hostname,
          urls: window.__remoteSmokeFetchUrls,
          barCount: bars.bars.length,
          toolbarVisible: Boolean(document.querySelector('#toolbar')?.getBoundingClientRect().height),
          chartVisible: Boolean(document.querySelector('#chart')?.getBoundingClientRect().height),
          overflowX: document.documentElement.scrollWidth - window.innerWidth,
        };
      })()
    `);
    assert.ok(indexResult.toolbarVisible, 'toolbar should be visible');
    assert.ok(indexResult.chartVisible, 'chart should be visible');
    assert.ok(indexResult.barCount > 0, 'remote API should return bars');
    assert.ok(indexResult.overflowX <= 2, `index page should not overflow horizontally: ${indexResult.overflowX}`);
    assert.ok(
      indexResult.urls.some((url) => url.startsWith(`${windowLocationProtocol(INDEX_URL)}//${indexResult.host}:8766/v4/bars?`)),
      `expected API calls to follow page host; saw ${indexResult.urls.join(', ')}`
    );

    await navigate(client, MAINTENANCE_URL, 1024, 768);
    const maintenanceResult = await evaluate(client, `
      (async () => {
        window.__maintenanceSmokeFetchUrls = [];
        window.fetch = (...args) => {
          window.__maintenanceSmokeFetchUrls.push(String(args[0]));
          return Promise.resolve(new Response('backend exploded', {
            status: 500,
            statusText: 'Internal Server Error',
            headers: { 'Content-Type': 'text/plain' },
          }));
        };
        document.querySelector('#envStatus').click();
        const deadline = Date.now() + 5_000;
        while (Date.now() < deadline) {
          const text = document.querySelector('#output')?.textContent || '';
          if (text.includes('backend exploded')) {
            return {
              href: window.location.href,
              host: window.location.hostname,
              text,
              urls: window.__maintenanceSmokeFetchUrls,
              hasKlineNotice: /K-line DB update path/.test(document.body.textContent),
              hasServerEnvOptions: ['V4_API_HOST', 'V4_ALLOWED_WEB_ORIGINS'].every((value) => Boolean(document.querySelector('#envKey option[value="' + value + '"]'))),
              outputVisible: Boolean(document.querySelector('#output')?.getBoundingClientRect().height),
              overflowX: document.documentElement.scrollWidth - window.innerWidth,
            };
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return {
          href: window.location.href,
          host: window.location.hostname,
          text: document.querySelector('#output')?.textContent || '',
          urls: window.__maintenanceSmokeFetchUrls,
          hasKlineNotice: false,
          hasServerEnvOptions: false,
          outputVisible: false,
          overflowX: document.documentElement.scrollWidth - window.innerWidth,
        };
      })()
    `);

    assert.ok(maintenanceResult.hasKlineNotice, 'K-line DB contract notice should be visible');
    assert.ok(maintenanceResult.hasServerEnvOptions, 'server env variables should be editable from maintenance UI');
    assert.ok(maintenanceResult.outputVisible, 'maintenance output should be visible');
    assert.ok(maintenanceResult.overflowX <= 2, `maintenance page should not overflow horizontally: ${maintenanceResult.overflowX}`);
    assert.match(maintenanceResult.text, /url=http:\/\/[^/]+:8766\/v4\/data_maintenance\/run/);
    assert.match(maintenanceResult.text, /http_status=500/);
    assert.match(maintenanceResult.text, /Response was not JSON/);
    assert.match(maintenanceResult.text, /backend exploded/);
    assert.ok(
      maintenanceResult.urls.every((url) => url.startsWith(`${windowLocationProtocol(MAINTENANCE_URL)}//${maintenanceResult.host}:8766/v4/data_maintenance/run`)),
      `expected maintenance calls to follow page host; saw ${maintenanceResult.urls.join(', ')}`
    );
  } finally {
    client?.close();
    chrome.kill('SIGTERM');
    await waitForProcessExit(chrome);
    await rm(PROFILE_DIR, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(() => {});
  }
}

function windowLocationProtocol(url) {
  return new URL(url).protocol;
}

await main();
console.log('remote maintenance responsive smoke passed');
