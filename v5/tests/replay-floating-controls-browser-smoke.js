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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9391);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-replay-floating-controls-browser-smoke-${process.pid}`;

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
            const open = 30000 + Math.sin(index / 7) * 20 + index * 0.5;
            bars.push({
              timestamp,
              open,
              high: open + 6,
              low: open - 6,
              close: open + (index % 2 ? -2 : 3),
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
            floating: rect('[data-replay-floating-controls]'),
          }));
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-replay-floating-controls',
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
              && document.querySelector('[data-replay-floating-controls]');
          });

          const toolbar = document.querySelector('[data-replay-workstation-toolbar]');
          const floating = document.querySelector('[data-replay-floating-controls]');
          const before = await commands.dispatchCommand('replay.getState');
          const chart = rect('[data-chart-host]');
          const floatingRect = rect('[data-replay-floating-controls]');
          const toolbarReplayCount = toolbar.querySelectorAll('[data-replay-next], [data-replay-play], [data-replay-pause], [data-replay-reset]').length;
          const topGoToInputs = toolbar.querySelectorAll('[data-chart-go-to-input]').length;
          const layoutDisabled = document.querySelector('[data-layout-open]')?.disabled === true;
          const goToInitiallyHidden = document.querySelector('[data-chart-go-to-popover]')?.hidden === true;
          const floatingDisplayTimeframeCount = floating.querySelectorAll('[data-display-timeframe-select]').length;
          const replayIntervalSelect = floating.querySelector('[data-replay-interval-select]');
          const replaySpeedInput = floating.querySelector('[data-replay-speed]');
          const disabledTransportPlaceholders = {
            truncate: floating.querySelector('[data-replay-truncate-to-selection]')?.disabled === true,
            previous: floating.querySelector('[data-replay-previous]')?.disabled === true,
            interval: replayIntervalSelect?.disabled === true,
            sync: floating.querySelector('[data-replay-sync-interval]')?.disabled === true,
          };

          document.querySelector('[data-replay-next]').click();
          await waitFor('next advanced', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.revealedCount === before.revealedCount + 1;
          });
          const afterNext = await commands.dispatchCommand('replay.getState');

          replaySpeedInput.value = '300';
          replaySpeedInput.dispatchEvent(new Event('input', { bubbles: true }));
          document.querySelector('[data-replay-play]').click();
          await waitFor('play uses selected speed', async () => {
            const playback = await commands.dispatchCommand('replay.getPlaybackState');
            return playback.playing === true && playback.intervalMs === 300;
          });
          document.querySelector('[data-replay-pause]').click();
          await waitFor('playback paused after speed check', async () => {
            const playback = await commands.dispatchCommand('replay.getPlaybackState');
            return playback.playing === false;
          });

          document.querySelector('[data-chart-go-to-open]').click();
          await waitFor('go to open', async () => document.querySelector('[data-chart-go-to-popover]')?.hidden === false);
          const goToOpened = document.querySelector('[data-chart-go-to-popover]')?.hidden === false;
          document.querySelector('[data-chart-go-to-cancel]').click();
          const goToClosed = document.querySelector('[data-chart-go-to-popover]')?.hidden === true;

          document.querySelector('[data-replay-reset]').click();
          await waitFor('reset', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.revealedCount === 0;
          });
          const afterReset = await commands.dispatchCommand('replay.getState');

          return JSON.stringify({
            error: '',
            beforeCursor: before.cursorTimestamp,
            afterNextCursor: afterNext.cursorTimestamp,
            speedPlaybackInterval: (await commands.dispatchCommand('replay.getPlaybackState')).intervalMs,
            afterResetCursor: afterReset.cursorTimestamp,
            afterResetRevealed: afterReset.revealedCount,
            toolbarReplayCount,
            topGoToInputs,
            layoutDisabled,
            goToInitiallyHidden,
            goToOpened,
            goToClosed,
            chart,
            floating: floatingRect,
            floatingInsideChart: floatingRect.left >= chart.left
              && floatingRect.right <= chart.right
              && floatingRect.top >= chart.top
              && floatingRect.bottom <= chart.bottom,
            priceAxisGap: chart.right - floatingRect.right,
            timeAxisGap: chart.bottom - floatingRect.bottom,
            floatingButtonCount: floating.querySelectorAll('button').length,
            floatingDisplayTimeframeCount,
            replayIntervalSelectCount: floating.querySelectorAll('[data-replay-interval-select]').length,
            replayIntervalSelectValue: replayIntervalSelect?.value || '',
            replaySpeedValue: replaySpeedInput?.value || '',
            disabledTransportPlaceholders,
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        } finally {
          window.fetch = originalFetch;
        }
      })()
    `));

    assert.equal(value.error, '', value.error || 'browser smoke failed');
    assert.equal(value.toolbarReplayCount, 0);
    assert.equal(value.topGoToInputs, 0);
    assert.equal(value.layoutDisabled, true);
    assert.equal(value.goToInitiallyHidden, true);
    assert.equal(value.goToOpened, true);
    assert.equal(value.goToClosed, true);
    assert.ok(value.floatingButtonCount >= 5);
    assert.equal(value.floatingDisplayTimeframeCount, 0);
    assert.equal(value.replayIntervalSelectCount, 1);
    assert.equal(value.replayIntervalSelectValue, '1');
    assert.equal(value.replaySpeedValue, '300');
    assert.equal(value.speedPlaybackInterval, 300);
    assert.deepEqual(value.disabledTransportPlaceholders, {
      truncate: true,
      previous: true,
      interval: true,
      sync: true,
    });
    assert.equal(value.floatingInsideChart, true, `floating controls outside chart: ${JSON.stringify(value)}`);
    assert.ok(value.priceAxisGap >= 120, `floating controls too close to price axis: ${value.priceAxisGap}`);
    assert.ok(value.timeAxisGap >= 80, `floating controls too close to time axis: ${value.timeAxisGap}`);
    assert.equal(value.beforeCursor, '2026-06-01T09:30:00.000Z');
    assert.notEqual(value.afterNextCursor, value.beforeCursor);
    assert.equal(value.afterResetCursor, value.beforeCursor);
    assert.equal(value.afterResetRevealed, 0);
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
  () => console.log('v5 replay floating controls browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
