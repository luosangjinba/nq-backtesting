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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9390);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-chart-responsive-visual-browser-smoke-${process.pid}`;

const scenarios = [
  { id: 'responsive-desktop', width: 1600, height: 1000, deviceScaleFactor: 1, minVisibleChartHeight: 420 },
  { id: 'responsive-laptop', width: 1366, height: 768, deviceScaleFactor: 1, minVisibleChartHeight: 220 },
  { id: 'responsive-low-height', width: 1280, height: 640, deviceScaleFactor: 1, minVisibleChartHeight: 120 },
  { id: 'responsive-narrow', width: 760, height: 820, deviceScaleFactor: 1, minVisibleChartHeight: 220 },
  { id: 'responsive-high-dpi', width: 1440, height: 900, deviceScaleFactor: 1.25, minVisibleChartHeight: 320 },
];

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
          const wave = Math.sin(index / 9) * 26;
          const open = 30000 + wave + index * 0.6;
          bars.push({
            timestamp,
            open,
            high: open + 8,
            low: open - 8,
            close: open + (index % 3 === 0 ? 5 : -3),
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
          toolbar: rect('[data-chart-toolbar]'),
          footer: rect('[data-replay-footer]'),
        }));
      }

      try {
        const commands = await import('/v5/src/runtime/commands.js');
        await commands.dispatchCommand('app.navigate', { routeId: 'setup' }).catch(() => null);
        const created = await commands.dispatchCommand('session.create', {
          id: '${id}',
          instrument: 'NQ',
          timeframe: 1,
          sessionStart: '2026-06-01 09:30',
          sessionEnd: '2026-06-01 11:00',
        });
        await commands.dispatchCommand('app.navigate', {
          routeId: 'chart',
          params: { sessionId: created.session.id },
        });
        await waitFor('initial loaded', async () => {
          const replay = await commands.dispatchCommand('replay.getState');
          const chart = await commands.dispatchCommand('chart.getInteractionState');
          return replay.status === 'initial-loaded'
            && document.querySelector('[data-chart-host]')?.dataset.chartEngine === 'lightweight-charts'
            && Array.isArray(chart.renderedBars)
            && chart.renderedBars.length >= 20
            && document.querySelector('[data-chart-toolbar]');
        });

        const replay = await commands.dispatchCommand('replay.getState');
        const chartState = await commands.dispatchCommand('chart.getInteractionState');
        const viewport = rect('.chart-viewport');
        const chart = rect('[data-chart-host]');
        const canvas = rect('[data-chart-canvas]');
        const surface = rect('[data-chart-engine-surface]');
        const toolbar = rect('[data-chart-toolbar]');
        const footer = rect('[data-replay-footer]');
        const status = rect('[data-replay-status]');
        const doc = document.documentElement;
        const visibleChartHeight = Math.max(
          0,
          Math.min(chart.bottom, window.innerHeight) - Math.max(chart.top, 0),
        );

        return JSON.stringify({
          error: '',
          engine: document.querySelector('[data-chart-host]')?.dataset.chartEngine || '',
          viewport,
          chart,
          canvas,
          surface,
          toolbar,
          footer,
          status,
          visibleChartHeight: Math.round(visibleChartHeight),
          clientWidth: doc.clientWidth,
          scrollWidth: doc.scrollWidth,
          replayStatus: replay.status,
          displayBars: replay.displayBars.length,
          renderedBars: chartState.renderedBars.length,
          toolbarInsideViewport: toolbar.left >= viewport.left
            && toolbar.right <= viewport.right
            && toolbar.top >= viewport.top
            && toolbar.bottom <= viewport.bottom,
          footerBelowChart: footer.top >= chart.bottom,
          statusVisible: status.width > 0 && status.height > 0,
        });
      } catch (error) {
        return JSON.stringify({ error: error?.stack || error?.message || String(error) });
      } finally {
        window.fetch = originalFetch;
      }
    })()
  `;
}

async function runScenario(client, pageUrl, scenario) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: scenario.width,
    height: scenario.height,
    deviceScaleFactor: scenario.deviceScaleFactor,
    mobile: false,
  });
  await client.send('Page.navigate', { url: pageUrl });
  await waitForExpression(client, `document.querySelector('[data-v5-root]')?.dataset.booted === 'true'`, 8_000);
  const value = JSON.parse(await evaluate(client, scenarioScript(scenario.id)));
  const screenshot = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  });

  assert.equal(value.error, '', value.error || 'browser smoke failed');
  assert.equal(value.engine, 'lightweight-charts');
  assert.equal(value.replayStatus, 'initial-loaded');
  assert.ok(value.displayBars >= 20, `${scenario.id} display bars too low: ${value.displayBars}`);
  assert.ok(value.renderedBars >= 20, `${scenario.id} rendered bars too low: ${value.renderedBars}`);
  assert.ok(value.chart.height >= 460, `${scenario.id} chart host too short: ${value.chart.height}`);
  assert.ok(value.canvas.height >= 458, `${scenario.id} chart canvas too short: ${value.canvas.height}`);
  assert.ok(value.surface.height >= 458, `${scenario.id} chart surface too short: ${value.surface.height}`);
  assert.ok(
    value.visibleChartHeight >= scenario.minVisibleChartHeight,
    `${scenario.id} visible chart area too short: ${value.visibleChartHeight}`,
  );
  assert.ok(
    value.scrollWidth <= value.clientWidth + 2,
    `${scenario.id} horizontal overflow: ${value.scrollWidth} > ${value.clientWidth}`,
  );
  assert.equal(value.toolbarInsideViewport, true, `${scenario.id} toolbar outside viewport: ${JSON.stringify(value)}`);
  assert.ok(
    value.chart.right - value.toolbar.right >= (scenario.width >= 1000 ? 56 : 12),
    `${scenario.id} toolbar too close to price axis: ${value.chart.right - value.toolbar.right}`,
  );
  assert.equal(value.footerBelowChart, true, `${scenario.id} footer overlaps chart`);
  assert.equal(value.statusVisible, true, `${scenario.id} status row hidden`);
  assert.ok(
    typeof screenshot?.data === 'string' && screenshot.data.length > 10_000,
    `${scenario.id} screenshot capture was empty`,
  );
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

    for (const scenario of scenarios) {
      await runScenario(client, pageUrl, scenario);
    }
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
  () => console.log('v5 chart responsive visual browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
