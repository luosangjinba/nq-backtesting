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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9389);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-chart-overlay-visibility-browser-smoke-${process.pid}`;

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

function scenarioScript(id) {
  return `
    (async () => {
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (...args) => {
        const url = String(args[0] || '');
        if (!url.includes('/v4/bars')) {
          return originalFetch(...args);
        }
        const parsed = new URL(url, window.location.href);
        const timeframe = Number(parsed.searchParams.get('tf') || 1);
        const stepSeconds = timeframe * 60;
        const start = Date.parse(parsed.searchParams.get('start').replace(' ', 'T') + ':00.000Z') / 1000;
        const end = Date.parse(parsed.searchParams.get('end').replace(' ', 'T') + ':00.000Z') / 1000;
        const bars = [];
        for (let timestamp = start; timestamp <= end; timestamp += stepSeconds) {
          const index = Math.round((timestamp - start) / stepSeconds);
          const open = 30000 + Math.sin(index / 8) * 40 + index;
          bars.push({
            timestamp,
            open,
            high: open + 10,
            low: open - 10,
            close: open + (index % 2 ? -4 : 4),
          });
        }
        return new Response(JSON.stringify({ bars }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      };

      function rect(selector) {
        const box = document.querySelector(selector)?.getBoundingClientRect();
        return {
          top: Math.round(box?.top || 0),
          right: Math.round(box?.right || 0),
          bottom: Math.round(box?.bottom || 0),
          left: Math.round(box?.left || 0),
          width: Math.round(box?.width || 0),
          height: Math.round(box?.height || 0),
        };
      }

      async function waitFor(label, predicate, timeoutMs = 8000) {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
          const value = await predicate();
          if (value) return value;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        throw new Error('waitFor timed out: ' + label + ' ' + JSON.stringify({
          statusText: document.querySelector('[data-replay-load-status]')?.textContent || '',
          chart: rect('[data-chart-host]'),
          nav: rect('[data-chart-toolbar]'),
          footer: rect('[data-replay-footer]'),
        }));
      }

      try {
        const commands = await import('/v5/src/runtime/commands.js');
        const created = await commands.dispatchCommand('session.create', {
          id: '${id}',
          instrument: 'NQ',
          timeframe: 1,
          sessionStart: '2026-06-01 09:30',
          sessionEnd: '2026-06-01 10:30',
        });
        await commands.dispatchCommand('app.navigate', {
          routeId: 'chart',
          params: { sessionId: created.session.id },
        });
        await waitFor('initial loaded', async () => {
          const state = await commands.dispatchCommand('replay.getState');
          return state.status === 'initial-loaded'
            && document.querySelector('[data-chart-host]')?.dataset.chartEngine === 'lightweight-charts'
            && document.querySelector('[data-chart-toolbar]');
        });

        const chart = rect('[data-chart-host]');
        const nav = rect('[data-chart-toolbar]');
        const footer = rect('[data-replay-footer]');
        return JSON.stringify({
          error: '',
          chart,
          nav,
          footer,
          topGap: nav.top - chart.top,
          rightPriceAxisGap: chart.right - nav.right,
          timeAxisGap: chart.bottom - nav.bottom,
          navHeight: nav.height,
          navWidth: nav.width,
        });
      } catch (error) {
        return JSON.stringify({ error: error?.stack || error?.message || String(error) });
      } finally {
        window.fetch = originalFetch;
      }
    })()
  `;
}

async function runScenario(client, pageUrl, { width, height, id }) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await client.send('Page.navigate', { url: pageUrl });
  await waitForExpression(client, `document.querySelector('[data-v5-root]')?.dataset.booted === 'true'`, 8_000);
  const value = JSON.parse(await evaluate(client, scenarioScript(id)));

  assert.equal(value.error, '', value.error || 'browser smoke failed');
  assert.ok(value.navHeight <= 42, `${id} chart toolbar too tall: ${value.navHeight}`);
  assert.ok(value.navWidth <= 190, `${id} chart toolbar too wide: ${value.navWidth}`);
  assert.ok(value.topGap >= 10, `${id} chart toolbar too close to top: ${value.topGap}`);
  assert.ok(value.rightPriceAxisGap >= 56, `${id} chart toolbar too close to price axis: ${value.rightPriceAxisGap}`);
  assert.ok(value.timeAxisGap >= 420, `${id} chart toolbar overlaps lower/time-axis area: ${value.timeAxisGap}`);
  assert.ok(value.footer.top >= value.chart.bottom, `${id} footer overlaps chart`);
  return value;
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

  let client = null;
  let chrome = null;
  try {
    await waitForHttpOk(pageUrl);

    chrome = spawn(CHROME_BIN, [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1600,1000',
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

    await runScenario(client, pageUrl, {
      width: 1600,
      height: 1000,
      id: 'browser-chart-overlay-visibility-large',
    });
    await runScenario(client, pageUrl, {
      width: 1280,
      height: 720,
      id: 'browser-chart-overlay-visibility-low',
    });
  } finally {
    client?.close();
    chrome?.kill('SIGTERM');
    if (chrome) await waitForProcessExit(chrome);
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
  () => console.log('v5 chart overlay visibility browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
