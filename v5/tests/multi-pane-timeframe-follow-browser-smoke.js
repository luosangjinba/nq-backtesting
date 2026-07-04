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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9416);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-multi-pane-timeframe-follow-${process.pid}`;

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
        const requests = [];
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
          requests.push({ timeframe, startText, endText });
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

        function paneState(paneId) {
          const canvas = canvasFor(paneId);
          return {
            paneId,
            displayTimeframe: canvas?.dataset.displayTimeframe || '',
            fullBarCount: Number(canvas?.dataset.fullBarCount || 0),
            renderedBarCount: Number(canvas?.dataset.renderedBarCount || 0),
            interactionMode: canvas?.dataset.interactionMode || '',
            viewportFollow: canvas?.dataset.viewportFollow || '',
            visibleLogicalRangeFrom: canvas?.dataset.visibleLogicalRangeFrom || '',
            visibleLogicalRangeTo: canvas?.dataset.visibleLogicalRangeTo || '',
            priceScaleVisible: canvas?.dataset.priceScaleVisible || '',
            timeScaleVisible: canvas?.dataset.timeScaleVisible || '',
            gridHorizontalVisible: canvas?.dataset.gridHorizontalVisible || '',
            gridVerticalVisible: canvas?.dataset.gridVerticalVisible || '',
            chartResizeWidth: canvas?.dataset.chartResizeWidth || '',
            chartResizeHeight: canvas?.dataset.chartResizeHeight || '',
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
            primary: paneState('primary'),
            secondary: paneState('secondary'),
            status: document.querySelector('[data-replay-load-status]')?.textContent || '',
            requests,
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
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-multi-pane-timeframe-follow',
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
          await waitFor('two panes ready', async () => (
            document.querySelector('[data-route="chart"]')?.dataset.layoutVariant === 'twice.vertical'
            && paneState('primary').fullBarCount > 0
            && paneState('secondary').fullBarCount > 0
          ));

          await clickPaneCenter('primary');
          await waitFor('primary active', async () =>
            document.querySelector('[data-route="chart"]')?.dataset.activePaneId === 'primary'
          );
          await commands.dispatchCommand('chart.setManualVisibleRange', {
            paneId: 'primary',
            from: '2026-06-01T09:10:00.000Z',
            to: '2026-06-01T09:30:00.000Z',
          });
          await waitFor('primary manual before TF switch', async () =>
            paneState('primary').interactionMode === 'manual'
          );

          const timeframeSelect = document.querySelector('[data-display-timeframe-select]');
          timeframeSelect.value = '60';
          timeframeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          const bugBaseline = await waitFor('primary 1H blank bug baseline', async () => {
            const primary = paneState('primary');
            return requests.some((request) => request.timeframe === 60)
              && primary.displayTimeframe === '1'
              && primary.fullBarCount > 0
              && primary.renderedBarCount === 0
              && primary.interactionMode === 'manual'
              && primary.viewportFollow === 'false'
              && primary.priceScaleVisible === 'true'
              && primary.timeScaleVisible === 'true';
          }, 10000);

          const primaryChartState = await commands.dispatchCommand('chart.getRenderedBars', { paneId: 'primary' });
          return JSON.stringify({
            error: '',
            activePaneId: document.querySelector('[data-route="chart"]')?.dataset.activePaneId || '',
            bugBaseline,
            primary: paneState('primary'),
            secondary: paneState('secondary'),
            primaryChartState: {
              fullBarCount: Number(primaryChartState?.fullBarCount || 0),
              renderedBars: Array.isArray(primaryChartState?.renderedBars)
                ? primaryChartState.renderedBars.length
                : 0,
              displayTimeframe: primaryChartState?.displayContext?.displayTimeframe || '',
              interactionMode: primaryChartState?.interaction?.mode || '',
            },
            requests,
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        } finally {
          window.fetch = originalFetch;
        }
      })();
    `));

    assert.equal(value.error, '', value.error || 'browser smoke failed');
    assert.equal(value.activePaneId, 'primary');
    assert.equal(value.primary.displayTimeframe, '1');
    assert.equal(value.primary.interactionMode, 'manual');
    assert.equal(value.primary.viewportFollow, 'false');
    assert.ok(value.primary.fullBarCount > 0, `primary bars should exist before the bug hides them: ${JSON.stringify(value)}`);
    assert.equal(value.primary.renderedBarCount, 0);
    assert.equal(value.primary.priceScaleVisible, 'true');
    assert.equal(value.primary.timeScaleVisible, 'true');
    assert.ok(
      value.requests.some((request) => request.timeframe === 60),
      `expected a 1H display-window request: ${JSON.stringify(value.requests)}`
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

console.log('v5 multi-pane timeframe follow browser smoke passed');
