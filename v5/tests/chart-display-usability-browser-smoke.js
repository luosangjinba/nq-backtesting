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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9386);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-chart-display-usability-browser-smoke-${process.pid}`;

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
    await client.send('Page.navigate', { url: pageUrl });
    await waitForExpression(client, `document.querySelector('[data-v5-root]')?.dataset.booted === 'true'`, 8_000);

    const value = JSON.parse(await evaluate(client, `
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
            const open = 1000 + Math.sin(index / 6) * 12 + index * 0.2;
            bars.push({
              timestamp,
              open,
              high: open + 2,
              low: open - 2,
              close: open + (index % 2 ? -0.8 : 0.8),
            });
          }
          return new Response(JSON.stringify({ bars }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        };

        function rectFor(selector) {
          const rect = document.querySelector(selector)?.getBoundingClientRect();
          return {
            width: Math.round(rect?.width || 0),
            height: Math.round(rect?.height || 0),
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
            host: rectFor('[data-chart-host]'),
            canvas: rectFor('[data-chart-canvas]'),
            surface: rectFor('[data-chart-engine-surface]'),
            chartOptionsCaptured: Boolean(window.__v5DisplayUsabilityMetrics?.chartOptions),
          }));
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          const metrics = { chartOptions: null };
          window.__v5DisplayUsabilityMetrics = metrics;
          const lightweightCharts = window.LightweightCharts;
          const originalCreateChart = lightweightCharts.createChart.bind(lightweightCharts);
          window.LightweightCharts = {
            ...lightweightCharts,
            createChart: (...args) => {
              metrics.chartOptions = args[1] || null;
              return originalCreateChart(...args);
            },
          };
          await commands.dispatchCommand('app.navigate', { routeId: 'setup' }).catch(() => null);
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-chart-display-usability',
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
              && typeof metrics.chartOptions?.timeScale?.tickMarkFormatter === 'function';
          });

          const formatter = metrics.chartOptions.timeScale.tickMarkFormatter;
          const intradayTick = formatter(Date.parse('2026-06-01T09:30:00.000Z') / 1000);
          const midnightTick = formatter(Date.parse('2026-06-01T00:00:00.000Z') / 1000);
          const canvas = document.querySelector('[data-chart-canvas]');
          const hostRect = rectFor('[data-chart-host]');
          const canvasRect = rectFor('[data-chart-canvas]');
          const surfaceRect = rectFor('[data-chart-engine-surface]');
          return JSON.stringify({
            error: '',
            intradayTick,
            midnightTick,
            hostRect,
            canvasRect,
            surfaceRect,
            canvasPaddingTop: canvas?.style.paddingTop || '',
            canvasPaddingBottom: canvas?.style.paddingBottom || '',
            canvasPaddingRight: canvas?.style.paddingRight || '',
            marginTop: canvas?.dataset.lightweightMarginTopPercent || '',
            marginBottom: canvas?.dataset.lightweightMarginBottomPercent || '',
            rightOffset: canvas?.dataset.timeScaleRightOffset || '',
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        } finally {
          window.fetch = originalFetch;
        }
      })()
    `));

    assert.equal(value.error, '', value.error || 'browser smoke failed');
    assert.equal(value.intradayTick, '09:30');
    assert.equal(value.midnightTick, '06-01');
    assert.notEqual(value.intradayTick, '1');
    assert.ok(value.hostRect.height >= 540, `chart host too short: ${value.hostRect.height}`);
    assert.ok(value.canvasRect.height >= 538, `chart canvas too short: ${value.canvasRect.height}`);
    assert.ok(value.surfaceRect.height >= 538, `chart surface too short: ${value.surfaceRect.height}`);
    assert.equal(value.canvasPaddingTop, '');
    assert.equal(value.canvasPaddingBottom, '');
    assert.equal(value.canvasPaddingRight, '');
    assert.equal(value.marginTop, '10');
    assert.equal(value.marginBottom, '8');
    assert.equal(value.rightOffset, '10');
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
  () => console.log('v5 chart display usability browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
