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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9384);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-chart-navigation-toolbar-browser-smoke-${process.pid}`;

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

        function chartSnapshot() {
          const canvas = document.querySelector('[data-chart-canvas]');
          return {
            mode: canvas?.dataset.interactionMode || '',
            follow: canvas?.dataset.viewportFollow || '',
            renderedBarCount: Number(canvas?.dataset.renderedBarCount || 0),
            status: document.querySelector('[data-replay-load-status]')?.textContent || '',
          };
        }

        function rectFor(selector) {
          const rect = document.querySelector(selector)?.getBoundingClientRect();
          return rect
            ? {
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom,
              width: rect.width,
              height: rect.height,
            }
            : null;
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
            id: 'browser-chart-navigation-toolbar',
            instrument: 'NQ',
            timeframe: 1,
            sessionStart: '2026-06-01 09:30',
            sessionEnd: '2026-06-01 09:45',
          });
          await commands.dispatchCommand('app.navigate', {
            routeId: 'chart',
            params: { sessionId: created.session.id },
          });
          document.querySelector('.chart-viewport').style.width = '120px';
          document.querySelector('[data-chart-host]').style.width = '120px';
          await waitFor('initial loaded', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            const chart = chartSnapshot();
            return state.status === 'initial-loaded'
              && chart.mode === 'follow'
              && chart.follow === 'true'
              && document.querySelector('[data-chart-toolbar]');
          });

          const toolbarButtons = Array.from(document.querySelectorAll('[data-chart-toolbar] button'));
          const viewportRect = rectFor('.chart-viewport');
          const toolbarRect = rectFor('[data-chart-toolbar]');
          const before = await commands.dispatchCommand('replay.getState');
          const beforeInteraction = await commands.dispatchCommand('chart.getInteractionState');
          const beforeTimestamps = beforeInteraction.renderedBars
            .map((bar) => Number(bar.timestamp || Date.parse(bar.time) / 1000))
            .filter(Number.isFinite);
          const beforeRange = beforeInteraction.visibleRange || {
            from: Math.min(...beforeTimestamps),
            to: Math.max(...beforeTimestamps),
          };
          const requestCountBefore = requests.length;

          document.querySelector('[data-chart-zoom-in]').click();
          await waitFor('zoom in manual', async () => {
            const chart = chartSnapshot();
            const interaction = await commands.dispatchCommand('chart.getInteractionState');
            return chart.mode === 'manual'
              && chart.follow === 'false'
              && interaction.visibleRange
              && interaction.visibleRange.to <= Date.parse(before.cursorTimestamp) / 1000;
          });
          const afterZoom = await commands.dispatchCommand('chart.getInteractionState');

          document.querySelector('[data-chart-pan-left]').click();
          await waitFor('pan left manual', async () => {
            const interaction = await commands.dispatchCommand('chart.getInteractionState');
            return interaction.visibleRange?.from < afterZoom.visibleRange.from;
          });
          const afterPanLeft = await commands.dispatchCommand('chart.getInteractionState');

          document.querySelector('[data-chart-pan-right]').click();
          document.querySelector('[data-chart-pan-right]').click();
          document.querySelector('[data-chart-pan-right]').click();
          await waitFor('pan right clamped', async () => {
            const interaction = await commands.dispatchCommand('chart.getInteractionState');
            return interaction.visibleRange?.to <= Date.parse(before.cursorTimestamp) / 1000
              && interaction.interaction.mode === 'manual';
          });
          const afterPanRight = await commands.dispatchCommand('chart.getInteractionState');

          document.querySelector('[data-chart-reset-view]').click();
          await waitFor('reset follow', async () => {
            const chart = chartSnapshot();
            return chart.mode === 'follow'
              && chart.follow === 'true';
          });
          const afterReset = await commands.dispatchCommand('chart.getInteractionState');
          const afterReplay = await commands.dispatchCommand('replay.getState');

          return JSON.stringify({
            error: '',
            toolbarButtonCount: toolbarButtons.length,
            toolbarDisabledCount: toolbarButtons.filter((button) => button.disabled).length,
            beforeCursor: before.cursorTimestamp,
            afterCursor: afterReplay.cursorTimestamp,
            beforeDisplayCount: before.displayBars.length,
            afterDisplayCount: afterReplay.displayBars.length,
            beforeMode: beforeInteraction.interaction.mode,
            beforeFollow: beforeInteraction.viewportFollow.enabled,
            afterZoomMode: afterZoom.interaction.mode,
            afterZoomFollow: afterZoom.viewportFollow.enabled,
            beforeRange,
            afterZoomRange: afterZoom.visibleRange,
            afterPanLeftRange: afterPanLeft.visibleRange,
            afterPanRightRange: afterPanRight.visibleRange,
            afterResetMode: afterReset.interaction.mode,
            afterResetFollow: afterReset.viewportFollow.enabled,
            viewportRect,
            toolbarRect,
            requestCountBefore,
            requestCountAfter: requests.length,
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        } finally {
          window.fetch = originalFetch;
        }
      })()
    `));

    assert.equal(value.error, '', value.error || 'browser smoke failed');
    assert.equal(value.toolbarButtonCount, 5);
    assert.equal(value.toolbarDisabledCount, 0);
    assert.equal(value.beforeCursor, '2026-06-01T09:30:00.000Z');
    assert.equal(value.afterCursor, value.beforeCursor);
    assert.ok(value.afterDisplayCount >= value.beforeDisplayCount);
    assert.equal(value.beforeMode, 'follow');
    assert.equal(value.beforeFollow, true);
    assert.equal(value.afterZoomMode, 'manual');
    assert.equal(value.afterZoomFollow, false);
    assert.ok(value.afterZoomRange.to <= Date.parse(value.beforeCursor) / 1000);
    assert.ok(value.afterZoomRange.to - value.afterZoomRange.from < value.beforeRange.to - value.beforeRange.from);
    assert.ok(value.afterPanLeftRange.from < value.afterZoomRange.from);
    assert.ok(value.afterPanRightRange.to <= Date.parse(value.beforeCursor) / 1000);
    assert.equal(value.afterResetMode, 'follow');
    assert.equal(value.afterResetFollow, true);
    assert.ok(value.viewportRect, 'expected chart viewport rect');
    assert.ok(value.toolbarRect, 'expected chart toolbar rect');
    assert.ok(value.toolbarRect.left >= value.viewportRect.left, `toolbar overflows left: ${JSON.stringify(value)}`);
    assert.ok(value.toolbarRect.right <= value.viewportRect.right, `toolbar overflows right: ${JSON.stringify(value)}`);
    assert.ok(value.toolbarRect.top >= value.viewportRect.top, `toolbar overflows top: ${JSON.stringify(value)}`);
    assert.ok(value.toolbarRect.bottom <= value.viewportRect.bottom, `toolbar overflows bottom: ${JSON.stringify(value)}`);
    assert.ok(value.requestCountAfter >= value.requestCountBefore);
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
  () => console.log('v5 chart navigation toolbar browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
