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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9376);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-chart-presentation-browser-smoke-${process.pid}`;

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
          throw new Error('waitFor timed out: ' + label + ' ' + JSON.stringify({
            cursorLabel: document.querySelector('[data-replay-cursor]')?.textContent || '',
            ohlcHidden: document.querySelector('[data-status-ohlc-row]')?.hidden,
            canvasPaddingTop: document.querySelector('[data-chart-canvas]')?.style.paddingTop || '',
            canvasPaddingRight: document.querySelector('[data-chart-canvas]')?.style.paddingRight || '',
            lightweightMarginTop: document.querySelector('[data-chart-canvas]')?.dataset.lightweightMarginTopPercent || '',
            lightweightRightOffset: document.querySelector('[data-chart-canvas]')?.dataset.timeScaleRightOffset || '',
            candleTitle: Array.from(document.querySelectorAll('.chart-candle')).at(-1)?.title || '',
          }));
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-chart-presentation',
            instrument: 'NQ',
            timeframe: 1,
            sessionStart: '2026-06-01 09:30',
            sessionEnd: '2026-06-01 09:40',
          });
          await commands.dispatchCommand('app.navigate', {
            routeId: 'chart',
            params: { sessionId: created.session.id },
          });
          await waitFor('initial loaded', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.status === 'initial-loaded';
          });

          const before = await commands.dispatchCommand('replay.getState');
          const requestCount = requests.length;
          const beforeCursorLabel = document.querySelector('[data-replay-cursor]')?.textContent || '';
          const beforeOhlcHidden = document.querySelector('[data-status-ohlc-row]')?.hidden;

          document.querySelector('[data-presentation-time-format="12h"]').click();
          document.querySelector('[data-presentation-toggle="showStatusOhlc"]').click();
          document.querySelector('[data-presentation-margin="compact"]').click();
          document.querySelector('[data-presentation-right-offset="16"]').click();

          await waitFor('presentation applied', async () =>
            document.querySelector('[data-replay-cursor]')?.textContent === '2026-06-01 9:30 AM'
              && document.querySelector('[data-status-ohlc-row]')?.hidden === true
              && document.querySelector('[data-chart-canvas]')?.style.paddingTop === ''
              && document.querySelector('[data-chart-canvas]')?.style.paddingBottom === ''
              && document.querySelector('[data-chart-canvas]')?.style.paddingRight === ''
              && document.querySelector('[data-chart-canvas]')?.dataset.lightweightMarginTopPercent === '6'
              && document.querySelector('[data-chart-canvas]')?.dataset.lightweightMarginBottomPercent === '6'
              && document.querySelector('[data-chart-canvas]')?.dataset.timeScaleRightOffset === '16'
              && Array.from(document.querySelectorAll('.chart-candle')).at(-1)?.title?.startsWith('2026-06-01 9:30 AM')
          );

          const after = await commands.dispatchCommand('replay.getState');
          return JSON.stringify({
            error: '',
            beforeCursorLabel,
            afterCursorLabel: document.querySelector('[data-replay-cursor]')?.textContent || '',
            beforeOhlcHidden,
            afterOhlcHidden: document.querySelector('[data-status-ohlc-row]')?.hidden,
            selected12h: document.querySelector('[data-presentation-time-format="12h"]')?.getAttribute('aria-pressed') || '',
            compactSelected: document.querySelector('[data-presentation-margin="compact"]')?.getAttribute('aria-pressed') || '',
            rightOffsetSelected: document.querySelector('[data-presentation-right-offset="16"]')?.getAttribute('aria-pressed') || '',
            afterCanvasPaddingTop: document.querySelector('[data-chart-canvas]')?.style.paddingTop || '',
            afterCanvasPaddingBottom: document.querySelector('[data-chart-canvas]')?.style.paddingBottom || '',
            afterCanvasPaddingRight: document.querySelector('[data-chart-canvas]')?.style.paddingRight || '',
            afterCanvasMarginTop: document.querySelector('[data-chart-canvas]')?.dataset.lightweightMarginTopPercent || '',
            afterCanvasMarginBottom: document.querySelector('[data-chart-canvas]')?.dataset.lightweightMarginBottomPercent || '',
            afterCanvasRightOffset: document.querySelector('[data-chart-canvas]')?.dataset.timeScaleRightOffset || '',
            beforeCursor: before.cursorTimestamp,
            afterCursor: after.cursorTimestamp,
            beforeDisplayCount: before.displayBars.length,
            afterDisplayCount: after.displayBars.length,
            requestCount,
            afterRequestCount: requests.length,
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        } finally {
          window.fetch = originalFetch;
        }
      })()
    `));

    assert.equal(value.error, '', value.error || 'browser smoke failed');
    assert.equal(value.beforeCursorLabel, '2026-06-01 09:30');
    assert.equal(value.afterCursorLabel, '2026-06-01 9:30 AM');
    assert.equal(value.beforeOhlcHidden, false);
    assert.equal(value.afterOhlcHidden, true);
    assert.equal(value.selected12h, 'true');
    assert.equal(value.compactSelected, 'true');
    assert.equal(value.rightOffsetSelected, 'true');
    assert.equal(value.afterCanvasPaddingTop, '');
    assert.equal(value.afterCanvasPaddingBottom, '');
    assert.equal(value.afterCanvasPaddingRight, '');
    assert.equal(value.afterCanvasMarginTop, '6');
    assert.equal(value.afterCanvasMarginBottom, '6');
    assert.equal(value.afterCanvasRightOffset, '16');
    assert.equal(value.afterCursor, value.beforeCursor);
    assert.equal(value.afterDisplayCount, value.beforeDisplayCount);
    assert.equal(value.afterRequestCount, value.requestCount);
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
  () => console.log('v5 chart presentation browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
