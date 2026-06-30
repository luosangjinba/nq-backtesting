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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9378);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-chart-interaction-browser-smoke-${process.pid}`;

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

        function chartSnapshot() {
          const canvas = document.querySelector('[data-chart-canvas]');
          return {
            mode: canvas?.dataset.interactionMode || '',
            follow: canvas?.dataset.viewportFollow || '',
            rendered: Number(canvas?.dataset.renderedBarCount || 0),
            full: Number(canvas?.dataset.fullBarCount || 0),
            titles: Array.from(document.querySelectorAll('.chart-candle')).map((item) => item.title),
          };
        }

        async function waitFor(label, predicate, timeoutMs = 8000) {
          const deadline = Date.now() + timeoutMs;
          while (Date.now() < deadline) {
            const value = await predicate();
            if (value) return value;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          throw new Error('waitFor timed out: ' + label + ' ' + JSON.stringify(chartSnapshot()));
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-chart-interaction',
            instrument: 'NQ',
            timeframe: 1,
            sessionStart: '2026-06-01 09:30',
            sessionEnd: '2026-06-01 09:35',
          });
          await commands.dispatchCommand('app.navigate', {
            routeId: 'chart',
            params: { sessionId: created.session.id },
          });
          document.querySelector('[data-chart-host]').style.width = '80px';
          await waitFor('initial loaded', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            const chart = chartSnapshot();
            return state.status === 'initial-loaded'
              && chart.mode === 'follow'
              && chart.follow === 'true'
              && chart.full === state.displayBars.length
              && chart.titles.at(-1)?.startsWith('2026-06-01 09:30');
          });

          const before = await commands.dispatchCommand('replay.getState');
          const requestCountBeforeManual = requests.length;
          await commands.dispatchCommand('chart.setManualVisibleRange', {
            from: '2026-06-01T09:25:00.000Z',
            to: '2026-06-01T09:27:00.000Z',
          });
          await waitFor('manual range rendered', async () => {
            const chart = chartSnapshot();
            return chart.mode === 'manual'
              && chart.follow === 'false'
              && chart.rendered === 3
              && chart.titles[0]?.startsWith('2026-06-01 09:25')
              && chart.titles.at(-1)?.startsWith('2026-06-01 09:27');
          });
          const manualChart = chartSnapshot();
          const afterManual = await commands.dispatchCommand('replay.getState');

          const requestCountBeforeNext = requests.length;
          document.querySelector('[data-replay-next]').click();
          await waitFor('next keeps manual range', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            const chart = chartSnapshot();
            return state.cursorTimestamp === '2026-06-01T09:31:00.000Z'
              && chart.mode === 'manual'
              && chart.follow === 'false'
              && chart.full === state.displayBars.length
              && chart.titles[0]?.startsWith('2026-06-01 09:25')
              && chart.titles.at(-1)?.startsWith('2026-06-01 09:27');
          });
          const afterNext = await commands.dispatchCommand('replay.getState');
          const afterNextChart = chartSnapshot();

          await commands.dispatchCommand('chart.resumeViewportFollow');
          await waitFor('resume follow', async () => {
            const chart = chartSnapshot();
            return chart.mode === 'follow'
              && chart.follow === 'true'
              && chart.titles.at(-1)?.startsWith('2026-06-01 09:31');
          });
          const resumedChart = chartSnapshot();

          return JSON.stringify({
            error: '',
            beforeCursor: before.cursorTimestamp,
            afterManualCursor: afterManual.cursorTimestamp,
            afterNextCursor: afterNext.cursorTimestamp,
            beforeDisplayCount: before.displayBars.length,
            afterManualDisplayCount: afterManual.displayBars.length,
            afterNextDisplayCount: afterNext.displayBars.length,
            manualMode: manualChart.mode,
            manualRendered: manualChart.rendered,
            manualFirstTitle: manualChart.titles[0] || '',
            manualLastTitle: manualChart.titles.at(-1) || '',
            afterNextMode: afterNextChart.mode,
            afterNextFirstTitle: afterNextChart.titles[0] || '',
            afterNextLastTitle: afterNextChart.titles.at(-1) || '',
            resumedMode: resumedChart.mode,
            resumedLastTitle: resumedChart.titles.at(-1) || '',
            requestCountBeforeManual,
            requestCountAfterManual: requestCountBeforeNext,
            requestCountAfterNext: requests.length,
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
    assert.equal(value.afterManualCursor, value.beforeCursor);
    assert.equal(value.afterNextCursor, '2026-06-01T09:31:00.000Z');
    assert.ok(value.afterManualDisplayCount >= value.beforeDisplayCount);
    assert.ok(value.afterNextDisplayCount >= value.afterManualDisplayCount);
    assert.equal(value.manualMode, 'manual');
    assert.equal(value.manualRendered, 3);
    assert.match(value.manualFirstTitle, /^2026-06-01 09:25/);
    assert.match(value.manualLastTitle, /^2026-06-01 09:27/);
    assert.equal(value.afterNextMode, 'manual');
    assert.match(value.afterNextFirstTitle, /^2026-06-01 09:25/);
    assert.match(value.afterNextLastTitle, /^2026-06-01 09:27/);
    assert.equal(value.resumedMode, 'follow');
    assert.match(value.resumedLastTitle, /^2026-06-01 09:31/);
    assert.ok(value.requestCountAfterManual >= value.requestCountBeforeManual);
    assert.ok(
      value.requestCountAfterNext === value.requestCountAfterManual
        || value.requestCountAfterNext === value.requestCountAfterManual + 1,
      'Next may use cache or request one forward window after manual demand settles'
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
  () => console.log('v5 chart interaction browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
