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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9385);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-chart-native-interaction-browser-smoke-${process.pid}`;

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
        const requests = [];
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
            const open = 500 + index;
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

        function waitFor(label, predicate, timeoutMs = 8000) {
          const deadline = Date.now() + timeoutMs;
          return new Promise((resolve, reject) => {
            const tick = async () => {
              try {
                const value = await predicate();
                if (value) {
                  resolve(value);
                  return;
                }
                if (Date.now() > deadline) {
                  reject(new Error('waitFor timed out: ' + label + ' ' + JSON.stringify({
                    statusText: document.querySelector('[data-replay-load-status]')?.textContent || '',
                    chartEngine: document.querySelector('[data-chart-host]')?.dataset.chartEngine || '',
                    hasVisibleRangeHandler: typeof window.__v5NativeInteractionMetrics?.visibleRangeHandler === 'function',
                    hasCrosshairHandler: typeof window.__v5NativeInteractionMetrics?.crosshairHandler === 'function',
                    chartOptionsCaptured: Boolean(window.__v5NativeInteractionMetrics?.chartOptions),
                    setDataCount: window.__v5NativeInteractionMetrics?.setDataCount,
                    metricsKeys: Object.keys(window.__v5NativeInteractionMetrics || {}),
                  })));
                  return;
                }
                setTimeout(tick, 100);
              } catch (error) {
                reject(error);
              }
            };
            tick();
          });
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          const metrics = {
            setDataCount: 0,
            setVisibleRangeCount: 0,
            setVisibleRanges: [],
            crosshairHandler: null,
            visibleRangeHandler: null,
            series: null,
            chartOptions: null,
          };
          window.__v5NativeInteractionMetrics = metrics;
          const lightweightCharts = window.LightweightCharts;
          const originalCreateChart = lightweightCharts.createChart.bind(lightweightCharts);
          const wrappedLightweightCharts = {
            ...lightweightCharts,
          };
          wrappedLightweightCharts.createChart = (...args) => {
            const chart = originalCreateChart(...args);
            metrics.chartOptions = args[1] || null;
            function wrapSeries(series) {
              metrics.series = series;
              const originalSetData = series.setData.bind(series);
              series.setData = (data) => {
                metrics.setDataCount += 1;
                return originalSetData(data);
              };
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
            const originalTimeScale = chart.timeScale.bind(chart);
            const timeScale = originalTimeScale();
            if (typeof timeScale.setVisibleRange === 'function') {
              const originalSetVisibleRange = timeScale.setVisibleRange.bind(timeScale);
              timeScale.setVisibleRange = (range) => {
                metrics.setVisibleRangeCount += 1;
                metrics.setVisibleRanges.push(range);
                return originalSetVisibleRange(range);
              };
            }
            if (typeof timeScale.subscribeVisibleTimeRangeChange === 'function') {
              const originalSubscribe = timeScale.subscribeVisibleTimeRangeChange.bind(timeScale);
              timeScale.subscribeVisibleTimeRangeChange = (handler) => {
                metrics.visibleRangeHandler = handler;
                return originalSubscribe(handler);
              };
            }
            chart.timeScale = () => timeScale;
            if (typeof chart.subscribeCrosshairMove === 'function') {
              const originalSubscribeCrosshair = chart.subscribeCrosshairMove.bind(chart);
              chart.subscribeCrosshairMove = (handler) => {
                metrics.crosshairHandler = handler;
                return originalSubscribeCrosshair(handler);
              };
            }
            return chart;
          };
          window.LightweightCharts = wrappedLightweightCharts;
          await commands.dispatchCommand('app.navigate', { routeId: 'setup' }).catch(() => null);
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-chart-native-interaction',
            instrument: 'NQ',
            timeframe: 1,
            sessionStart: '2026-06-01 09:30',
            sessionEnd: '2026-06-01 09:45',
          });
          await commands.dispatchCommand('app.navigate', {
            routeId: 'chart',
            params: { sessionId: created.session.id },
          });
          await waitFor('initial loaded', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return ['initial-loaded', 'display-loaded', 'replay-ready'].includes(state.status)
              && document.querySelector('[data-chart-host]')?.dataset.chartEngine === 'lightweight-charts'
              && typeof metrics.visibleRangeHandler === 'function'
              && typeof metrics.crosshairHandler === 'function';
          });

          const before = await commands.dispatchCommand('replay.getState');
          const cursor = Date.parse(before.cursorTimestamp) / 1000;
          const setDataBeforeNativeRange = metrics.setDataCount;
          const canvas = document.querySelector('[data-chart-canvas]');
          canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 300 }));
          for (let index = 0; index < 8; index += 1) {
            metrics.visibleRangeHandler({
              from: Date.parse('2026-06-01T09:22:00.000Z') / 1000 + index,
              to: Date.parse('2026-06-01T09:29:00.000Z') / 1000 + index,
            });
          }
          await waitFor('manual native range', async () => {
            const interaction = await commands.dispatchCommand('chart.getInteractionState');
            return interaction.interaction.mode === 'manual'
              && interaction.viewportFollow.enabled === false;
          });
          const afterNativeRange = await commands.dispatchCommand('chart.getInteractionState');
          const setDataAfterNativeRange = metrics.setDataCount;

          metrics.visibleRangeHandler({
            from: cursor + 60,
            to: cursor + 600,
          });
          await waitFor('right edge clamp', async () => metrics.setVisibleRanges.some((range) => range.to <= cursor));
          const afterClamp = await commands.dispatchCommand('chart.getInteractionState');
          const setDataAfterClamp = metrics.setDataCount;

          for (let index = 0; index < 10; index += 1) {
            metrics.crosshairHandler({
              time: Date.parse('2026-06-01T09:30:00.000Z') / 1000,
              point: { x: 100 + index, y: 120 },
              seriesData: new Map([[metrics.series, {
                time: Date.parse('2026-06-01T09:30:00.000Z') / 1000,
                open: 530,
                high: 531,
                low: 529,
                close: 530.5,
              }]]),
            });
          }
          await waitFor('crosshair active', async () => {
            const crosshair = await commands.dispatchCommand('chart.getCrosshairState');
            return crosshair.crosshair.active === true;
          });
          const crosshair = await commands.dispatchCommand('chart.getCrosshairState');
          const setDataAfterCrosshair = metrics.setDataCount;

          return JSON.stringify({
            error: '',
            beforeCursor: before.cursorTimestamp,
            setDataBeforeNativeRange,
            setDataAfterNativeRange,
            setDataAfterClamp,
            setDataAfterCrosshair,
            setVisibleRangeCount: metrics.setVisibleRangeCount,
            clampedRange: metrics.setVisibleRanges.at(-1) || null,
            afterNativeMode: afterNativeRange.interaction.mode,
            afterNativeFollow: afterNativeRange.viewportFollow.enabled,
            afterNativeRange: afterNativeRange.visibleRange,
            afterClampRange: afterClamp.visibleRange,
            canvasMode: canvas.dataset.interactionMode,
            canvasFollow: canvas.dataset.viewportFollow,
            gridColor: metrics.chartOptions?.grid?.vertLines?.color || '',
            crosshairColor: metrics.chartOptions?.crosshair?.vertLine?.color || '',
            crosshairActive: crosshair.crosshair.active,
            crosshairTime: crosshair.crosshair.time,
            requestCount: requests.length,
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        } finally {
          window.fetch = originalFetch;
        }
      })()
    `));

    assert.equal(value.error, '', value.error || 'browser smoke failed');
    assert.equal(value.beforeCursor, '2026-06-01T09:30:00.000Z');
    assert.equal(value.setDataAfterNativeRange, value.setDataBeforeNativeRange);
    assert.equal(value.setDataAfterClamp, value.setDataBeforeNativeRange);
    assert.equal(value.setDataAfterCrosshair, value.setDataBeforeNativeRange);
    assert.equal(value.afterNativeMode, 'manual');
    assert.equal(value.afterNativeFollow, false);
    assert.ok(value.afterNativeRange.to <= Date.parse('2026-06-01T09:30:00.000Z') / 1000);
    assert.ok(value.setVisibleRangeCount >= 1);
    assert.ok(value.clampedRange.to <= Date.parse('2026-06-01T09:30:00.000Z') / 1000);
    assert.ok(value.afterClampRange.to <= Date.parse('2026-06-01T09:30:00.000Z') / 1000);
    assert.equal(value.canvasMode, 'manual');
    assert.equal(value.canvasFollow, 'false');
    assert.equal(value.gridColor, 'rgba(55, 65, 81, 0.28)');
    assert.equal(value.crosshairColor, 'rgba(148, 163, 184, 0.42)');
    assert.equal(value.crosshairActive, true);
    assert.ok(value.crosshairTime);
    assert.ok(value.requestCount >= 1);
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
  () => console.log('v5 chart native interaction browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
