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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9402);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-multi-pane-viewport-demand-browser-smoke-${process.pid}`;

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
        const barRequests = [];
        const displayLoadedEvents = [];
        let beforeSecondaryChartState = null;
        window.fetch = async (...args) => {
          const url = String(args[0] || '');
          if (!url.includes('/v4/bars')) return originalFetch(...args);
          const parsed = new URL(url, window.location.href);
          const timeframe = Number(parsed.searchParams.get('tf') || 1);
          const startText = parsed.searchParams.get('start');
          const endText = parsed.searchParams.get('end');
          const stepSeconds = timeframe * 60;
          const start = Date.parse(startText.replace(' ', 'T') + ':00.000Z') / 1000;
          const end = Date.parse(endText.replace(' ', 'T') + ':00.000Z') / 1000;
          barRequests.push({ timeframe, startText, endText });
          const bars = [];
          for (let timestamp = start; timestamp <= end; timestamp += stepSeconds) {
            const index = Math.round((timestamp - start) / stepSeconds);
            const open = 30000 + (index * Math.max(1, timeframe));
            bars.push({
              timestamp,
              open,
              high: open + 4,
              low: open - 4,
              close: open + (index % 2 ? -1 : 1),
            });
          }
          return new Response(JSON.stringify({ bars }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        };

        function canvasFor(paneId) {
          return document.querySelector('[data-layout-pane][data-pane-id="' + paneId + '"] [data-chart-canvas]');
        }

        function canvasState(paneId) {
          const canvas = canvasFor(paneId);
          return {
            displayTimeframe: canvas?.dataset.displayTimeframe || '',
            fullBarCount: Number(canvas?.dataset.fullBarCount || 0),
            renderedBarCount: Number(canvas?.dataset.renderedBarCount || 0),
            interactionMode: canvas?.dataset.interactionMode || '',
          };
        }

        async function waitFor(label, predicate, timeoutMs = 8000) {
          const deadline = performance.now() + timeoutMs;
          while (performance.now() < deadline) {
            const value = await predicate();
            if (value) return value;
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
          throw new Error('waitFor timed out: ' + label + ' ' + JSON.stringify({
            activePaneId: document.querySelector('[data-route="chart"]')?.dataset.activePaneId || '',
            primary: canvasState('primary'),
            secondary: canvasState('secondary'),
            status: document.querySelector('[data-replay-load-status]')?.textContent || '',
            requests: barRequests,
            displayLoadedEvents,
            beforeSecondaryChartState,
          }));
        }

        async function clickPaneCenter(paneId) {
          const pane = document.querySelector('[data-layout-pane][data-pane-id="' + paneId + '"]');
          if (!pane) throw new Error('Missing pane ' + paneId);
          const box = pane.getBoundingClientRect();
          const clientX = Math.round(box.left + box.width / 2);
          const clientY = Math.round(box.top + box.height / 2);
          const target = document.elementFromPoint(clientX, clientY) || pane;
          target.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            button: 0,
            clientX,
            clientY,
          }));
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          const events = await import('/v5/src/runtime/events.js');
          const unsubscribe = events.subscribeEvent('replay:displayWindowLoaded', (payload = {}) => {
            displayLoadedEvents.push({
              paneId: payload.paneId || '',
              displayTimeframe: Number(payload.displayTimeframe || 0),
              displayBars: Array.isArray(payload.displayBars) ? payload.displayBars.length : 0,
              rendered: Boolean(payload.displayWindow?.rendered),
              baseBarCount: Number(payload.displayWindow?.baseBarCount || 0),
              mergedBarCount: Number(payload.displayWindow?.mergedBarCount || 0),
              anchor: payload.displayWindow?.anchor || '',
            });
          });
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-multi-pane-viewport-demand',
            instrument: 'NQ',
            timeframe: 1,
            sessionStart: '2026-06-01 09:30',
            sessionEnd: '2026-06-01 11:30',
          });
          await commands.dispatchCommand('app.navigate', {
            routeId: 'chart',
            params: { sessionId: created.session.id },
          });
          await waitFor('initial loaded', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.status === 'initial-loaded'
              && document.querySelector('[data-replay-next]')?.disabled === false;
          });

          document.querySelector('[data-layout-open]')?.click();
          await waitFor('layout popover open', async () =>
            document.querySelector('[data-layout-popover]')?.hidden === false
          );
          document.querySelector('[data-layout-variant-option="twice.vertical"]')?.click();
          await waitFor('twice vertical secondary initialized', async () => (
            document.querySelector('[data-route="chart"]')?.dataset.layoutVariant === 'twice.vertical'
            && canvasState('secondary').displayTimeframe === '1'
            && canvasState('secondary').fullBarCount > 20
          ));

          await clickPaneCenter('secondary');
          await waitFor('secondary active', async () =>
            document.querySelector('[data-route="chart"]')?.dataset.activePaneId === 'secondary'
          );
          const timeframeSelect = document.querySelector('[data-display-timeframe-select]');
          timeframeSelect.value = '5';
          timeframeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          await waitFor('secondary switched to 5m', async () => (
            canvasState('primary').displayTimeframe === '1'
            && canvasState('secondary').displayTimeframe === '5'
            && canvasState('secondary').fullBarCount > 8
          ));

          const beforePrimary = canvasState('primary');
          const beforeSecondary = canvasState('secondary');
          const secondaryChartState = await commands.dispatchCommand('chart.getRenderedBars', {
            paneId: 'secondary',
          });
          beforeSecondaryChartState = {
            paneId: secondaryChartState?.paneId || '',
            displayTimeframe: secondaryChartState?.displayContext?.displayTimeframe || '',
            fullBarCount: Number(secondaryChartState?.fullBarCount || 0),
            barsLength: Array.isArray(secondaryChartState?.bars)
              ? secondaryChartState.bars.length
              : 0,
          };
          const requestsBeforeDemand = barRequests.length;
          await commands.dispatchCommand('chart.setManualVisibleRange', {
            paneId: 'secondary',
            from: '2026-06-01T02:30:00.000Z',
            to: '2026-06-01T04:00:00.000Z',
          });
          await waitFor('secondary viewport demand loaded without mouseup', async () => {
            const secondary = canvasState('secondary');
            return secondary.displayTimeframe === '5'
              && secondary.fullBarCount > beforeSecondary.fullBarCount
              && displayLoadedEvents.some((event) => (
                event.paneId === 'secondary'
                && event.displayTimeframe === 5
                && event.displayBars > beforeSecondary.fullBarCount
              ));
          }, 10000);

          const afterPrimary = canvasState('primary');
          const afterSecondary = canvasState('secondary');
          const demandRequests = barRequests.slice(requestsBeforeDemand);
          unsubscribe();
          return JSON.stringify({
            error: '',
            beforePrimary,
            beforeSecondary,
            beforeSecondaryChartState,
            afterPrimary,
            afterSecondary,
            displayLoadedEvents,
            demandRequests,
            activePaneId: document.querySelector('[data-route="chart"]')?.dataset.activePaneId || '',
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        } finally {
          window.fetch = originalFetch;
        }
      })()
    `));

    assert.equal(value.error, '', value.error || 'browser smoke failed');
    assert.equal(value.activePaneId, 'secondary');
    assert.equal(value.beforePrimary.displayTimeframe, '1');
    assert.equal(value.afterPrimary.displayTimeframe, '1');
    assert.equal(value.afterPrimary.fullBarCount, value.beforePrimary.fullBarCount);
    assert.equal(value.beforeSecondary.displayTimeframe, '5');
    assert.equal(value.afterSecondary.displayTimeframe, '5');
    assert.ok(
      value.afterSecondary.fullBarCount > value.beforeSecondary.fullBarCount,
      `secondary pane did not extend left: ${JSON.stringify(value)}`
    );
    assert.ok(
      value.demandRequests.some((request) => request.timeframe === 5),
      `expected a 5m pane-local demand request: ${JSON.stringify(value.demandRequests)}`
    );
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

console.log('v5 multi-pane viewport demand browser smoke passed');
