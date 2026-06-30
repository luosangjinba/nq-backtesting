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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9377);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-replay-viewport-follow-browser-smoke-${process.pid}`;

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
            const open = 400 + index;
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

        function renderedTitles() {
          return Array.from(document.querySelectorAll('.chart-candle')).map((item) => item.title);
        }

        function chartCounts() {
          const canvas = document.querySelector('[data-chart-canvas]');
          return {
            rendered: Number(canvas?.dataset.renderedBarCount || 0),
            full: Number(canvas?.dataset.fullBarCount || 0),
            follow: canvas?.dataset.viewportFollow || '',
            titles: renderedTitles(),
          };
        }

        async function waitFor(label, predicate, timeoutMs = 8000) {
          const deadline = Date.now() + timeoutMs;
          while (Date.now() < deadline) {
            const value = await predicate();
            if (value) return value;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          throw new Error('waitFor timed out: ' + label + ' ' + JSON.stringify(chartCounts()));
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          await commands.dispatchCommand('chartPresentation.set', {
            rightOffsetBars: 1,
          });
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-replay-viewport-follow',
            instrument: 'NQ',
            timeframe: 1,
            sessionStart: '2026-06-01 09:30',
            sessionEnd: '2026-06-01 09:32',
          });
          await commands.dispatchCommand('app.navigate', {
            routeId: 'chart',
            params: { sessionId: created.session.id },
          });
          document.querySelector('[data-chart-host]').style.width = '40px';
          await waitFor('initial followed', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            const counts = chartCounts();
            return state.status === 'initial-loaded'
              && counts.follow === 'true'
              && counts.full === state.displayBars.length
              && counts.rendered === 3
              && counts.titles[0]?.startsWith('2026-06-01 09:28')
              && counts.titles.at(-1)?.startsWith('2026-06-01 09:30');
          });
          const before = await commands.dispatchCommand('replay.getState');
          const beforeCounts = chartCounts();
          const requestCount = requests.length;

          document.querySelector('[data-replay-next]').click();
          await waitFor('next followed', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            const counts = chartCounts();
            return state.cursorTimestamp === '2026-06-01T09:31:00.000Z'
              && counts.full === state.displayBars.length
              && counts.rendered === 3
              && counts.titles[0]?.startsWith('2026-06-01 09:29')
              && counts.titles.at(-1)?.startsWith('2026-06-01 09:31');
          });

          const after = await commands.dispatchCommand('replay.getState');
          const afterCounts = chartCounts();
          return JSON.stringify({
            error: '',
            beforeCursor: before.cursorTimestamp,
            afterCursor: after.cursorTimestamp,
            beforeDisplayCount: before.displayBars.length,
            afterDisplayCount: after.displayBars.length,
            beforeRenderedCount: beforeCounts.rendered,
            afterRenderedCount: afterCounts.rendered,
            beforeFullCount: beforeCounts.full,
            afterFullCount: afterCounts.full,
            beforeFirstTitle: beforeCounts.titles[0] || '',
            afterFirstTitle: afterCounts.titles[0] || '',
            afterLastTitle: afterCounts.titles.at(-1) || '',
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
    assert.equal(value.beforeCursor, '2026-06-01T09:30:00.000Z');
    assert.equal(value.afterCursor, '2026-06-01T09:31:00.000Z');
    assert.equal(value.beforeDisplayCount, 4);
    assert.equal(value.afterDisplayCount, 5);
    assert.equal(value.beforeRenderedCount, 3);
    assert.equal(value.afterRenderedCount, 3);
    assert.equal(value.beforeFullCount, 4);
    assert.equal(value.afterFullCount, 5);
    assert.match(value.beforeFirstTitle, /^2026-06-01 09:28/);
    assert.match(value.afterFirstTitle, /^2026-06-01 09:29/);
    assert.match(value.afterLastTitle, /^2026-06-01 09:31/);
    assert.ok(
      value.afterRequestCount === value.requestCount || value.afterRequestCount === value.requestCount + 1,
      'Next may use cache or request one forward window, but viewport follow must not add extra requests'
    );
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
  () => console.log('v5 replay viewport follow browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
