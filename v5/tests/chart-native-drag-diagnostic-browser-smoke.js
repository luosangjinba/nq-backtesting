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
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-chart-native-drag-diagnostic-browser-smoke-${process.pid}`;

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

async function dispatchDrag(client, { label, fromX, toX, y, steps, delayMs }) {
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: fromX,
    y,
    button: 'none',
    buttons: 0,
  });
  await client.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: fromX,
    y,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  });
  for (let index = 1; index <= steps; index += 1) {
    const x = fromX + ((toX - fromX) * index) / steps;
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x,
      y,
      button: 'left',
      buttons: 1,
    });
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    await evaluate(client, `
      window.__v5DragDiagnosticEmitRange?.(${JSON.stringify(label)}, ${index}, ${steps});
      true
    `);
  }
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: toX,
    y,
    button: 'left',
    buttons: 0,
    clickCount: 1,
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
    await client.send('Page.bringToFront');
    await waitForExpression(client, `document.querySelector('[data-v5-root]')?.dataset.booted === 'true'`, 8_000);

    const setupValue = JSON.parse(await evaluate(client, `
      (async () => {
        const originalFetch = window.fetch.bind(window);
        window.__v5DragDiagnosticOriginalFetch = originalFetch;
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
          const start = Date.parse(startText.replace(' ', 'T') + ':00.000Z') / 1000;
          const end = Date.parse(endText.replace(' ', 'T') + ':00.000Z') / 1000;
          const bars = [];
          for (let timestamp = start; timestamp <= end; timestamp += stepSeconds) {
            const index = Math.round((timestamp - start) / stepSeconds);
            const open = 1000 + index;
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

        const commands = await import('/v5/src/runtime/commands.js');
        window.__v5DragDiagnosticCommands = commands;

        const metrics = {
          setDataCount: 0,
          setVisibleRangeCount: 0,
          setVisibleLogicalRangeCount: 0,
          baselineSetDataCount: 0,
          baselineSetVisibleRangeCount: 0,
          baselineSetVisibleLogicalRangeCount: 0,
          visibleEvents: [],
          pointerEvents: [],
          currentDrag: '',
          visibleRangeHandler: null,
        };
        window.__v5DragDiagnosticMetrics = metrics;

        const lightweightCharts = window.LightweightCharts;
        const originalCreateChart = lightweightCharts.createChart.bind(lightweightCharts);
        window.LightweightCharts = {
          ...lightweightCharts,
          createChart(...args) {
            const chart = originalCreateChart(...args);
            function wrapSeries(series) {
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
            const originalSetVisibleRange = timeScale.setVisibleRange?.bind(timeScale);
            if (originalSetVisibleRange) {
              timeScale.setVisibleRange = (range) => {
                metrics.setVisibleRangeCount += 1;
                return originalSetVisibleRange(range);
              };
            }
            const originalSetVisibleLogicalRange = timeScale.setVisibleLogicalRange?.bind(timeScale);
            if (originalSetVisibleLogicalRange) {
              timeScale.setVisibleLogicalRange = (range) => {
                metrics.setVisibleLogicalRangeCount += 1;
                return originalSetVisibleLogicalRange(range);
              };
            }
            const originalSubscribe = timeScale.subscribeVisibleTimeRangeChange?.bind(timeScale);
            if (originalSubscribe) {
              timeScale.subscribeVisibleTimeRangeChange = (handler) => {
                const wrapped = (range) => {
                  const logicalRange = typeof timeScale.getVisibleLogicalRange === 'function'
                    ? timeScale.getVisibleLogicalRange()
                    : null;
                  metrics.visibleEvents.push({
                    drag: metrics.currentDrag,
                    range: range ? { ...range } : null,
                    logicalRange: logicalRange ? { ...logicalRange } : null,
                  });
                  return handler(range);
                };
                metrics.visibleRangeHandler = wrapped;
                return originalSubscribe(wrapped);
              };
            }
            chart.timeScale = () => timeScale;
            return chart;
          },
        };

        window.__v5DragDiagnosticEmitRange = (label, index, steps) => {
          metrics.currentDrag = label;
          const baseFrom = Date.parse('2026-06-01T09:45:00.000Z') / 1000;
          const baseTo = Date.parse('2026-06-01T10:30:00.000Z') / 1000;
          const shiftSeconds = Math.round((index / Math.max(1, steps)) * 720);
          metrics.visibleRangeHandler?.({
            from: baseFrom + shiftSeconds,
            to: baseTo + shiftSeconds,
          });
        };

        await commands.dispatchCommand('app.navigate', { routeId: 'setup' }).catch(() => null);
        const created = await commands.dispatchCommand('session.create', {
          id: 'browser-chart-native-drag-diagnostic',
          instrument: 'NQ',
          timeframe: 1,
          sessionStart: '2026-06-01 09:30',
          sessionEnd: '2026-06-01 11:00',
        });
        await commands.dispatchCommand('app.navigate', {
          routeId: 'chart',
          params: { sessionId: created.session.id },
        });

        const deadline = Date.now() + 8000;
        while (Date.now() < deadline) {
          const state = await commands.dispatchCommand('replay.getState');
          if (['initial-loaded', 'display-loaded', 'replay-ready'].includes(state.status)
            && document.querySelector('[data-chart-host]')?.dataset.chartEngine === 'lightweight-charts') {
            const diagnosticBars = [];
            for (
              let timestamp = Date.parse('2026-06-01T09:30:00.000Z') / 1000;
              timestamp <= Date.parse('2026-06-01T11:00:00.000Z') / 1000;
              timestamp += 60
            ) {
              const index = Math.round((timestamp - (Date.parse('2026-06-01T09:30:00.000Z') / 1000)) / 60);
              const open = 1000 + index;
              diagnosticBars.push({
                time: new Date(timestamp * 1000).toISOString(),
                open,
                high: open + 1,
                low: open - 1,
                close: open + 0.5,
              });
            }
            await commands.dispatchCommand('chart.replaceBars', { bars: diagnosticBars });
            await new Promise((resolve) => setTimeout(resolve, 100));
            await commands.dispatchCommand('chart.setViewportFollow', {
              enabled: true,
              cursorTimestamp: '2026-06-01T10:30:00.000Z',
              estimatedVisibleBars: 60,
              rightOffsetBars: 10,
            });
            await new Promise((resolve) => setTimeout(resolve, 100));
            const canvas = document.querySelector('[data-chart-engine-surface]') || document.querySelector('[data-chart-canvas]');
            metrics.baselineSetDataCount = metrics.setDataCount;
            metrics.baselineSetVisibleRangeCount = metrics.setVisibleRangeCount;
            metrics.baselineSetVisibleLogicalRangeCount = metrics.setVisibleLogicalRangeCount;
            document.addEventListener('mousedown', (event) => {
              if (!metrics.currentDrag) return;
              metrics.pointerEvents.push({
                drag: metrics.currentDrag,
                type: event.type,
                x: event.clientX,
                y: event.clientY,
              });
            }, true);
            document.addEventListener('mousemove', (event) => {
              if (!metrics.currentDrag) return;
              metrics.pointerEvents.push({
                drag: metrics.currentDrag,
                type: event.type,
                x: event.clientX,
                y: event.clientY,
              });
            }, true);
            document.addEventListener('mouseup', (event) => {
              metrics.pointerEvents.push({
                drag: metrics.currentDrag,
                type: event.type,
                x: event.clientX,
                y: event.clientY,
              });
            }, true);
            const rect = canvas.getBoundingClientRect();
            return JSON.stringify({
              error: '',
              rect: {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
              },
            });
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return JSON.stringify({ error: 'chart did not load' });
      })()
    `));
    assert.equal(setupValue.error, '', setupValue.error || 'setup failed');
    assert.ok(setupValue.rect.width > 300, `chart width too small: ${JSON.stringify(setupValue.rect)}`);

    async function runDrag(label, { steps, delayMs }) {
      const rect = setupValue.rect;
      const fromX = Math.round(rect.left + rect.width * 0.62);
      const toX = Math.round(rect.left + rect.width * 0.42);
      const y = Math.round(rect.top + rect.height * 0.52);
      await evaluate(client, `
        window.__v5DragDiagnosticMetrics.currentDrag = ${JSON.stringify(label)};
        document.querySelector('[data-chart-canvas]')?.dispatchEvent(new MouseEvent('mousedown', {
          bubbles: true,
          button: 0,
          clientX: ${fromX},
          clientY: ${y},
        }));
        true
      `);
      await dispatchDrag(client, { label, fromX, toX, y, steps, delayMs });
      await evaluate(client, `
        document.dispatchEvent(new MouseEvent('mouseup', {
          bubbles: true,
          button: 0,
          clientX: ${toX},
          clientY: ${y},
        }));
        true
      `);
      await new Promise((resolve) => setTimeout(resolve, 180));
      await evaluate(client, `
        window.__v5DragDiagnosticMetrics.currentDrag = '';
      `);
    }

    await runDrag('slow', { steps: 12, delayMs: 25 });
    await runDrag('fast', { steps: 2, delayMs: 0 });

    const value = JSON.parse(await evaluate(client, `
      (async () => {
        const commands = window.__v5DragDiagnosticCommands;
        const metrics = window.__v5DragDiagnosticMetrics;
        const interaction = await commands.dispatchCommand('chart.getInteractionState');
        function summarize(label) {
          const pointers = metrics.pointerEvents.filter((event) => event.drag === label);
          const moves = pointers.filter((event) => event.type === 'mousemove');
          const firstPointer = pointers[0] || null;
          const lastPointer = [...pointers].reverse().find((event) => event.type === 'mouseup') || pointers.at(-1) || null;
          const ranges = metrics.visibleEvents.filter((event) => event.drag === label && event.range);
          const firstRange = ranges[0] || null;
          const lastRange = ranges.at(-1) || null;
          const firstLogical = ranges.find((event) => event.logicalRange)?.logicalRange || null;
          const lastLogical = [...ranges].reverse().find((event) => event.logicalRange)?.logicalRange || null;
          const pointerDeltaX = firstPointer && lastPointer ? lastPointer.x - firstPointer.x : 0;
          const visibleDeltaSeconds = firstRange && lastRange
            ? Number(lastRange.range.from) - Number(firstRange.range.from)
            : 0;
          const logicalDeltaBars = firstLogical && lastLogical
            ? Number(lastLogical.from) - Number(firstLogical.from)
            : 0;
          return {
            label,
            pointerCount: pointers.length,
            moveCount: moves.length,
            rangeCount: ranges.length,
            pointerDeltaX,
            visibleDeltaSeconds,
            logicalDeltaBars,
            secondsPerPixel: pointerDeltaX ? visibleDeltaSeconds / pointerDeltaX : null,
            barsPerPixel: pointerDeltaX ? logicalDeltaBars / pointerDeltaX : null,
          };
        }
        return JSON.stringify({
          error: '',
          setDataCount: metrics.setDataCount,
          setVisibleRangeCount: metrics.setVisibleRangeCount,
          setVisibleLogicalRangeCount: metrics.setVisibleLogicalRangeCount,
          setDataDelta: metrics.setDataCount - metrics.baselineSetDataCount,
          setVisibleRangeDelta: metrics.setVisibleRangeCount - metrics.baselineSetVisibleRangeCount,
          setVisibleLogicalRangeDelta: metrics.setVisibleLogicalRangeCount - metrics.baselineSetVisibleLogicalRangeCount,
          slow: summarize('slow'),
          fast: summarize('fast'),
          interactionMode: interaction.interaction.mode,
          viewportFollow: interaction.viewportFollow.enabled,
        });
      })()
    `));

    assert.equal(value.error, '', value.error || 'diagnostic failed');
    for (const summary of [value.slow, value.fast]) {
      assert.ok(summary.pointerCount >= 3, `missing pointer samples: ${JSON.stringify(value)}`);
      assert.ok(summary.moveCount >= 1, `missing move samples: ${JSON.stringify(value)}`);
      assert.ok(summary.rangeCount >= 1, `missing visible range samples: ${JSON.stringify(value)}`);
      assert.ok(Math.abs(summary.pointerDeltaX) >= 100, `drag delta too small: ${JSON.stringify(value)}`);
      assert.notEqual(summary.visibleDeltaSeconds, 0, `visible range did not move: ${JSON.stringify(value)}`);
      assert.equal(
        Math.sign(summary.visibleDeltaSeconds),
        -Math.sign(summary.pointerDeltaX),
        `visible range moved opposite expected pan direction: ${JSON.stringify(value)}`
      );
    }
    assert.equal(value.setDataDelta, 0, `drag should not trigger runtime setData: ${JSON.stringify(value)}`);
    assert.equal(value.interactionMode, 'manual');
    assert.equal(value.viewportFollow, false);
  } finally {
    if (client) {
      await evaluate(client, `
        if (window.__v5DragDiagnosticOriginalFetch) {
          window.fetch = window.__v5DragDiagnosticOriginalFetch;
        }
        true
      `).catch(() => {});
      client.close();
    }
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
  () => console.log('v5 chart native drag diagnostic browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
