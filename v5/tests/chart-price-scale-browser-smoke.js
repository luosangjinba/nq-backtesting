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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9388);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-chart-price-scale-browser-smoke-${process.pid}`;

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
            const open = 30000 + Math.sin(index / 10) * 60 + index * 2;
            bars.push({
              timestamp,
              open,
              high: open + 18,
              low: open - 18,
              close: open + (index % 2 ? -8 : 8),
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
          throw new Error('waitFor timed out: ' + label + ' ' + JSON.stringify({
            statusText: document.querySelector('[data-replay-load-status]')?.textContent || '',
            chartEngine: document.querySelector('[data-chart-host]')?.dataset.chartEngine || '',
            metrics: window.__v5PriceScaleMetrics || null,
          }));
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          const metrics = {
            priceScaleApplyOptions: [],
            seriesOptions: null,
            setDataCount: 0,
          };
          window.__v5PriceScaleMetrics = metrics;
          const lightweightCharts = window.LightweightCharts;
          const originalCreateChart = lightweightCharts.createChart.bind(lightweightCharts);
          window.LightweightCharts = {
            ...lightweightCharts,
            createChart: (...args) => {
              const chart = originalCreateChart(...args);
              const wrapSeries = (series, options) => {
                metrics.seriesOptions = options || null;
                const originalSetData = series.setData.bind(series);
                series.setData = (data) => {
                  metrics.setDataCount += 1;
                  return originalSetData(data);
                };
                if (typeof series.priceScale === 'function') {
                  const originalPriceScale = series.priceScale.bind(series);
                  series.priceScale = () => {
                    const priceScale = originalPriceScale();
                    if (!priceScale.__v5Wrapped && typeof priceScale.applyOptions === 'function') {
                      const originalApplyOptions = priceScale.applyOptions.bind(priceScale);
                      priceScale.applyOptions = (payload) => {
                        metrics.priceScaleApplyOptions.push(payload);
                        return originalApplyOptions(payload);
                      };
                      priceScale.__v5Wrapped = true;
                    }
                    return priceScale;
                  };
                }
                return series;
              };
              if (typeof chart.addCandlestickSeries === 'function') {
                const originalAddCandlestickSeries = chart.addCandlestickSeries.bind(chart);
                chart.addCandlestickSeries = (...seriesArgs) =>
                  wrapSeries(originalAddCandlestickSeries(...seriesArgs), seriesArgs[0]);
              }
              if (typeof chart.addSeries === 'function') {
                const originalAddSeries = chart.addSeries.bind(chart);
                chart.addSeries = (...seriesArgs) =>
                  wrapSeries(originalAddSeries(...seriesArgs), seriesArgs[1]);
              }
              return chart;
            },
          };
          await commands.dispatchCommand('app.navigate', { routeId: 'setup' }).catch(() => null);
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-chart-price-scale',
            instrument: 'NQ',
            timeframe: 1,
            sessionStart: '2026-06-01 09:30',
            sessionEnd: '2026-06-01 10:30',
          });
          await commands.dispatchCommand('app.navigate', {
            routeId: 'chart',
            params: { sessionId: created.session.id },
          });
          await waitFor('initial price scale applied', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.status === 'initial-loaded'
              && metrics.priceScaleApplyOptions.some((payload) =>
                payload?.scaleMargins?.top === 0.1 && payload?.scaleMargins?.bottom === 0.08
              );
          });

          document.querySelector('[data-chart-settings-open]').click();
          await waitFor('settings open', async () =>
            document.querySelector('[data-chart-settings-popover]')?.hidden === false
          );
          document.querySelector('[data-presentation-margin="compact"]').click();
          await waitFor('compact price scale applied', async () =>
            metrics.priceScaleApplyOptions.some((payload) =>
              payload?.scaleMargins?.top === 0.06 && payload?.scaleMargins?.bottom === 0.08
            )
              && document.querySelector('[data-chart-canvas]')?.dataset.priceScaleMarginTop === '0.06'
              && document.querySelector('[data-chart-canvas]')?.dataset.priceScaleMarginBottom === '0.08'
          );

          const canvas = document.querySelector('[data-chart-canvas]');
          return JSON.stringify({
            error: '',
            seriesOptions: metrics.seriesOptions,
            priceScaleApplyOptions: metrics.priceScaleApplyOptions,
            setDataCount: metrics.setDataCount,
            defaultMarginTop: metrics.priceScaleApplyOptions[0]?.scaleMargins?.top,
            defaultMarginBottom: metrics.priceScaleApplyOptions[0]?.scaleMargins?.bottom,
            canvasMarginTop: canvas?.dataset.priceScaleMarginTop || '',
            canvasMarginBottom: canvas?.dataset.priceScaleMarginBottom || '',
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        } finally {
          window.fetch = originalFetch;
        }
      })()
    `));

    assert.equal(value.error, '', value.error || 'browser smoke failed');
    assert.equal(value.seriesOptions.priceFormat.precision, 2);
    assert.equal(value.defaultMarginTop, 0.1);
    assert.equal(value.defaultMarginBottom, 0.08);
    assert.ok(value.priceScaleApplyOptions.some((payload) => payload.scaleMargins.top === 0.06));
    assert.equal(value.canvasMarginTop, '0.06');
    assert.equal(value.canvasMarginBottom, '0.08');
    assert.ok(value.setDataCount >= 1);
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
  () => console.log('v5 chart price scale browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
