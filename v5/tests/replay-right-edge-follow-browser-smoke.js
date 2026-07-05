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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9414);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-replay-right-edge-follow-${process.pid}`;

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
          const start = Date.parse(parsed.searchParams.get('start').replace(' ', 'T') + ':00.000Z') / 1000;
          const end = Date.parse(parsed.searchParams.get('end').replace(' ', 'T') + ':00.000Z') / 1000;
          const step = Number(parsed.searchParams.get('tf') || 1) * 60;
          const bars = [];
          for (let timestamp = start; timestamp <= end; timestamp += step) {
            const index = Math.round((timestamp - start) / step);
            const open = 100 + index;
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

        function paneMetrics() {
          return Array.from(document.querySelectorAll('[data-chart-canvas]')).map((canvas) => {
            const renderedBarCount = Number(canvas.dataset.renderedBarCount || 0);
            const logicalTo = Number(canvas.dataset.visibleLogicalRangeTo);
            const rightOffsetBars = Number(canvas.dataset.timeScaleRightOffset || 0);
            return {
              paneId: canvas.closest('[data-layout-pane]')?.dataset.paneId || 'primary',
              renderedBarCount,
              fullBarCount: Number(canvas.dataset.fullBarCount || 0),
              viewportCursorTimestamp: Number(canvas.dataset.viewportCursorTimestamp || 0),
              rightOffsetBars,
              visibleLogicalRangeFrom: Number(canvas.dataset.visibleLogicalRangeFrom),
              visibleLogicalRangeTo: logicalTo,
              latestLogicalIndex: renderedBarCount - 1,
              latestRightOffset: logicalTo - (renderedBarCount - 1),
            };
          });
        }

        async function waitFor(label, predicate, timeoutMs = 6000) {
          const deadline = performance.now() + timeoutMs;
          while (performance.now() < deadline) {
            const value = await predicate();
            if (value) return value;
            await new Promise((resolve) => setTimeout(resolve, 20));
          }
          const state = await window.__v5Commands?.dispatchCommand('replay.getState').catch(() => null);
          throw new Error('waitFor timed out: ' + label + ' ' + JSON.stringify({
            state,
            panes: paneMetrics(),
          }));
        }

        async function clickNextAndWait(expectedCursorTimestamp) {
          document.querySelector('[data-replay-next]').click();
          await waitFor('cursor ' + expectedCursorTimestamp, async () =>
            paneMetrics().every((pane) => pane.viewportCursorTimestamp === expectedCursorTimestamp)
          );
          return waitFor('right edge wall ' + expectedCursorTimestamp, async () => {
            const metrics = paneMetrics();
            return metrics.length > 0
              && metrics.every((pane) => pane.viewportCursorTimestamp === expectedCursorTimestamp)
              && metrics.every((pane) => pane.latestRightOffset === pane.rightOffsetBars)
              && metrics;
          });
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          window.__v5Commands = commands;
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-replay-right-edge-follow',
            instrument: 'NQ',
            timeframe: 1,
            sessionStart: '2026-06-01T09:30:00.000Z',
            sessionEnd: '2026-06-01T10:30:00.000Z',
          });
          await commands.dispatchCommand('app.navigate', {
            routeId: 'chart',
            params: { sessionId: created.session.id },
          });
          await waitFor('initial loaded', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.status === 'initial-loaded'
              && !document.querySelector('[data-replay-next]')?.disabled
              && paneMetrics().length === 1
              && paneMetrics()[0].renderedBarCount > 0;
          });

          const firstCursor = Date.parse('2026-06-01T09:31:00.000Z') / 1000;
          const secondCursor = Date.parse('2026-06-01T09:32:00.000Z') / 1000;
          const singleAfterFirst = await clickNextAndWait(firstCursor);
          const singleAfterSecond = await clickNextAndWait(secondCursor);
          await commands.dispatchCommand('chart.setManualVisibleRange', {
            from: secondCursor - 600,
            to: secondCursor,
          });
          await waitFor('manual viewport', async () => {
            const interaction = await commands.dispatchCommand('chart.getInteractionState');
            return interaction.interaction?.mode === 'manual'
              && interaction.viewportFollow?.enabled === false
              && interaction;
          });
          const thirdCursorAfterManual = Date.parse('2026-06-01T09:33:00.000Z') / 1000;
          const singleAfterManualNext = await clickNextAndWait(thirdCursorAfterManual);
          const afterManualNextInteraction = await commands.dispatchCommand('chart.getInteractionState');

          await commands.dispatchCommand('layout.setMode', {
            mode: 'twice',
            variant: 'twice.vertical',
          });
          await waitFor('two panes rendered', async () =>
            paneMetrics().length === 2
              && paneMetrics().every((pane) => pane.renderedBarCount > 0)
              && paneMetrics().every((pane) => pane.viewportCursorTimestamp === thirdCursorAfterManual)
          );

          const fourthCursor = Date.parse('2026-06-01T09:34:00.000Z') / 1000;
          const multiAfterNext = await clickNextAndWait(fourthCursor);

          return JSON.stringify({
            error: '',
            singleAfterFirst,
            singleAfterSecond,
            singleAfterManualNext,
            afterManualNextInteraction,
            multiAfterNext,
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        } finally {
          window.fetch = originalFetch;
        }
      })();
    `));

    assert.equal(value.error, '', value.error || 'browser smoke failed');
    for (const pane of [
      ...value.singleAfterFirst,
      ...value.singleAfterSecond,
      ...value.singleAfterManualNext,
      ...value.multiAfterNext,
    ]) {
      assert.equal(
        pane.latestRightOffset,
        pane.rightOffsetBars,
        `latest candle should remain anchored before the right offset wall: ${JSON.stringify(pane)}`
      );
      assert.ok(
        pane.visibleLogicalRangeFrom < 0 || pane.renderedBarCount >= 2,
        `follow range should be allowed to reserve left whitespace while early replay fills: ${JSON.stringify(pane)}`
      );
    }
    assert.equal(value.singleAfterFirst.length, 1);
    assert.equal(value.singleAfterSecond.length, 1);
    assert.equal(value.singleAfterManualNext.length, 1);
    assert.equal(value.afterManualNextInteraction.interaction.mode, 'follow');
    assert.equal(value.afterManualNextInteraction.viewportFollow.enabled, true);
    assert.equal(value.multiAfterNext.length, 2);
  } finally {
    if (client) {
      try {
        await client.close();
      } catch {
        // Ignore cleanup failures.
      }
    }
    if (chrome) chrome.kill('SIGTERM');
    web.kill('SIGTERM');
    await waitForProcessExit(chrome).catch(() => {});
    await waitForProcessExit(web).catch(() => {});
    await rm(PROFILE_DIR, { recursive: true, force: true }).catch(() => {});
  }
}

await main();

console.log('v5 replay right edge follow browser smoke passed');
