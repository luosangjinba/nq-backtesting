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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9381);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-chart-crosshair-browser-smoke-${process.pid}`;

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

    const setup = JSON.parse(await evaluate(client, `
      (async () => {
        const originalFetch = window.fetch.bind(window);
        const requests = [];
        window.__v5CrosshairRestoreFetch = () => {
          window.fetch = originalFetch;
          delete window.__v5CrosshairRestoreFetch;
        };
        window.__v5CrosshairRequests = requests;
        window.fetch = async (...args) => {
          const url = String(args[0] || '');
          if (!url.includes('/v4/bars')) {
            return originalFetch(...args);
          }
          const parsed = new URL(url, window.location.href);
          const timeframe = Number(parsed.searchParams.get('tf') || 1);
          const stepSeconds = timeframe * 60;
          const startText = parsed.searchParams.get('start');
          const endText = parsed.searchParams.get('end');
          requests.push({ timeframe, start: startText, end: endText });
          const start = Date.parse(startText.replace(' ', 'T') + ':00.000Z') / 1000;
          const end = Date.parse(endText.replace(' ', 'T') + ':00.000Z') / 1000;
          const bars = [];
          for (let timestamp = start; timestamp <= end; timestamp += stepSeconds) {
            const index = Math.round((timestamp - start) / stepSeconds);
            const open = 300 + index;
            bars.push({
              timestamp,
              open,
              high: open + 1,
              low: open - 1,
              close: open + 0.5,
            });
          }
          return new Response(JSON.stringify({ bars }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        };

        async function waitFor(label, predicate, timeoutMs = 8000) {
          const deadline = Date.now() + timeoutMs;
          while (Date.now() < deadline) {
            const value = await predicate();
            if (value) return value;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          throw new Error('waitFor timed out: ' + label);
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          const originalLightweightCharts = window.LightweightCharts;
          const originalCreateChart = originalLightweightCharts.createChart.bind(originalLightweightCharts);
          const crosshairMetrics = {
            handler: null,
            series: null,
          };
          window.__v5CrosshairMetrics = crosshairMetrics;
          window.LightweightCharts = {
            ...originalLightweightCharts,
            createChart(...args) {
              const chart = originalCreateChart(...args);
              function wrapSeries(series) {
                crosshairMetrics.series = series;
                return series;
              }
              if (typeof chart.addCandlestickSeries === 'function') {
                const originalAddCandlestickSeries = chart.addCandlestickSeries.bind(chart);
                chart.addCandlestickSeries = (...seriesArgs) => wrapSeries(originalAddCandlestickSeries(...seriesArgs));
              }
              if (typeof chart.addSeries === 'function') {
                const originalAddSeries = chart.addSeries.bind(chart);
                chart.addSeries = (...seriesArgs) => wrapSeries(originalAddSeries(...seriesArgs));
              }
              if (typeof chart.subscribeCrosshairMove === 'function') {
                const originalSubscribeCrosshair = chart.subscribeCrosshairMove.bind(chart);
                chart.subscribeCrosshairMove = (handler) => {
                  crosshairMetrics.handler = handler;
                  return originalSubscribeCrosshair(handler);
                };
              }
              return chart;
            },
          };
          await commands.dispatchCommand('app.navigate', { routeId: 'setup' }).catch(() => null);
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-chart-crosshair',
            instrument: 'NQ',
            timeframe: 1,
            sessionStart: '2026-06-01 09:30',
            sessionEnd: '2026-06-01 09:40',
          });
          await commands.dispatchCommand('app.navigate', {
            routeId: 'chart',
            params: { sessionId: created.session.id },
          });
          document.querySelector('[data-chart-host]').style.width = '520px';
          await waitFor('initial loaded', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.status === 'initial-loaded'
              && document.querySelector('[data-chart-host]')?.dataset.chartEngine === 'lightweight-charts'
              && typeof crosshairMetrics.handler === 'function';
          });
          await commands.dispatchCommand('chart.setViewportFollow', {
            enabled: true,
            cursorTimestamp: '2026-06-01T09:30:00.000Z',
            estimatedVisibleBars: 8,
            rightOffsetBars: 1,
            resume: true,
          });
          const before = await commands.dispatchCommand('replay.getState');
          const interaction = await commands.dispatchCommand('chart.getInteractionState');
          const target = document.querySelector('[data-chart-engine-surface] canvas')
            || document.querySelector('[data-chart-engine-surface]')
            || document.querySelector('[data-chart-host]');
          const rect = target.getBoundingClientRect();
          return JSON.stringify({
            error: '',
            x: Math.round(rect.left + (rect.width * 0.62)),
            y: Math.round(rect.top + (rect.height * 0.5)),
            targetWidth: rect.width,
            targetHeight: rect.height,
            beforeCursor: before.cursorTimestamp,
            beforeDisplayCount: before.displayBars.length,
            beforeMode: interaction.interaction.mode,
            beforeFollow: interaction.viewportFollow.enabled,
            requestCount: requests.length,
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        }
      })()
    `));
    assert.equal(setup.error, '', setup.error || 'browser setup failed');

    const value = JSON.parse(await evaluate(client, `
      (async () => {
        window.__v5CrosshairMetrics.handler({
          time: Date.parse('2026-06-01T09:30:00.000Z') / 1000,
          point: { x: ${setup.x}, y: ${setup.y} },
          seriesData: new Map([[window.__v5CrosshairMetrics.series, {
            time: Date.parse('2026-06-01T09:30:00.000Z') / 1000,
            open: 300,
            high: 301,
            low: 299,
            close: 300.5,
          }]]),
        });

        async function waitFor(label, predicate, timeoutMs = 8000) {
          const deadline = Date.now() + timeoutMs;
          while (Date.now() < deadline) {
            const value = await predicate();
            if (value) return value;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          throw new Error('waitFor timed out: ' + label + ' ' + JSON.stringify({
            readout: document.querySelector('[data-crosshair-inspection-readout]')?.textContent || '',
            active: document.querySelector('[data-chart-canvas]')?.dataset.crosshairActive || '',
          }));
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          await waitFor('crosshair readout', async () => {
            const readout = document.querySelector('[data-crosshair-inspection-readout]')?.textContent || '';
            return readout.includes('P ') && readout.includes('O ');
          });
          const readout = document.querySelector('[data-crosshair-inspection-readout]')?.textContent || '';
          const crosshair = await commands.dispatchCommand('chart.getCrosshairState');
          const state = await commands.dispatchCommand('replay.getState');
          const interaction = await commands.dispatchCommand('chart.getInteractionState');
          document.querySelector('[data-chart-settings-open]').click();
          await waitFor('settings open', async () =>
            document.querySelector('[data-chart-settings-popover]')?.hidden === false
          );
          document.querySelector('[data-presentation-toggle="showCrosshairReadout"]').click();
          await waitFor('crosshair hidden', async () =>
            document.querySelector('[data-crosshair-row]')?.hidden === true
              && document.querySelector('[data-crosshair-inspection-readout]')?.textContent === '--'
          );
          const after = await commands.dispatchCommand('replay.getState');
          const afterInteraction = await commands.dispatchCommand('chart.getInteractionState');
          window.__v5CrosshairRestoreFetch?.();
          return JSON.stringify({
            error: '',
            readout,
            crosshairActive: crosshair.crosshair.active,
            crosshairTime: crosshair.crosshair.time,
            crosshairPrice: crosshair.crosshair.price,
            cursor: state.cursorTimestamp,
            displayCount: state.displayBars.length,
            mode: interaction.interaction.mode,
            follow: interaction.viewportFollow.enabled,
            afterCursor: after.cursorTimestamp,
            afterDisplayCount: after.displayBars.length,
            afterMode: afterInteraction.interaction.mode,
            afterFollow: afterInteraction.viewportFollow.enabled,
            requestCount: window.__v5CrosshairRequests?.length || 0,
            rowHidden: document.querySelector('[data-crosshair-row]')?.hidden,
            readoutAfterHide: document.querySelector('[data-crosshair-inspection-readout]')?.textContent || '',
          });
        } catch (error) {
          window.__v5CrosshairRestoreFetch?.();
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        }
      })()
    `));

    assert.equal(value.error, '', value.error || 'browser smoke failed');
    assert.equal(value.crosshairActive, true);
    assert.match(value.readout, /P \d+\.\d{2}/);
    assert.match(value.readout, /O \d+/);
    assert.ok(value.crosshairTime);
    assert.equal(value.cursor, setup.beforeCursor);
    assert.equal(value.afterCursor, setup.beforeCursor);
    assert.equal(value.displayCount, setup.beforeDisplayCount);
    assert.equal(value.afterDisplayCount, setup.beforeDisplayCount);
    assert.equal(value.mode, setup.beforeMode);
    assert.equal(value.afterMode, setup.beforeMode);
    assert.equal(value.follow, setup.beforeFollow);
    assert.equal(value.afterFollow, setup.beforeFollow);
    assert.equal(value.requestCount, setup.requestCount);
    assert.equal(value.rowHidden, true);
    assert.equal(value.readoutAfterHide, '--');
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
  () => console.log('v5 chart crosshair browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
