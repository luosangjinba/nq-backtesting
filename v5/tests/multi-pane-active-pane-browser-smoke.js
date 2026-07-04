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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9401);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-multi-pane-active-pane-browser-smoke-${process.pid}`;

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
          if (!url.includes('/v4/bars')) return originalFetch(...args);
          const parsed = new URL(url, window.location.href);
          const timeframe = Number(parsed.searchParams.get('tf') || 1);
          const stepSeconds = timeframe * 60;
          const start = Date.parse(parsed.searchParams.get('start').replace(' ', 'T') + ':00.000Z') / 1000;
          const end = Date.parse(parsed.searchParams.get('end').replace(' ', 'T') + ':00.000Z') / 1000;
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

        function effectivePaneTimeframes(layoutState) {
          return layoutState.panes.map((pane) => Number(pane.displayTimeframe || 1));
        }

        const checkpoints = [];
        async function checkpoint(label) {
          const layoutState = await window.__v5CommandsForSmoke.dispatchCommand('layout.getState');
          checkpoints.push({
            label,
            domActivePaneId: document.querySelector('[data-route="chart"]')?.dataset.activePaneId || '',
            runtimeActivePaneId: layoutState.activePaneId || '',
            primaryInteraction: canvasFor('primary')?.dataset.interactionMode || '',
            secondaryInteraction: canvasFor('secondary')?.dataset.interactionMode || '',
          });
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
            primary: {
              tf: canvasFor('primary')?.dataset.displayTimeframe || '',
              interaction: canvasFor('primary')?.dataset.interactionMode || '',
            },
            secondary: {
              tf: canvasFor('secondary')?.dataset.displayTimeframe || '',
              interaction: canvasFor('secondary')?.dataset.interactionMode || '',
            },
            status: document.querySelector('[data-replay-load-status]')?.textContent || '',
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

        function clickPaneCenterNow(paneId) {
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
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          window.__v5CommandsForSmoke = commands;
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-multi-pane-active-pane',
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
              && document.querySelector('[data-replay-next]')?.disabled === false;
          });

          document.querySelector('[data-layout-open]')?.click();
          await waitFor('layout popover open', async () =>
            document.querySelector('[data-layout-popover]')?.hidden === false
          );
          document.querySelector('[data-layout-variant-option="twice.vertical"]')?.click();
          await waitFor('twice vertical hosts present before secondary display init', async () => (
            document.querySelector('[data-route="chart"]')?.dataset.layoutVariant === 'twice.vertical'
            && document.querySelectorAll('[data-chart-host]').length === 2
          ));
          await waitFor('twice vertical defaults to secondary active pane', async () => (
            document.querySelector('[data-route="chart"]')?.dataset.activePaneId === 'secondary'
          ));

          const timeframeSelect = document.querySelector('[data-display-timeframe-select]');
          clickPaneCenterNow('primary');
          await waitFor('primary active pane before primary timeframe change', async () => (
            document.querySelector('[data-route="chart"]')?.dataset.activePaneId === 'primary'
            && timeframeSelect?.value === '1'
          ));
          timeframeSelect.value = '60';
          timeframeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          await waitFor('primary timeframe does not leak to secondary', async () => {
            const layoutState = await commands.dispatchCommand('layout.getState');
            return effectivePaneTimeframes(layoutState)[0] === 60
              && effectivePaneTimeframes(layoutState)[1] === 1
              && canvasFor('primary')?.dataset.displayTimeframe === '60'
              && canvasFor('secondary')?.dataset.displayTimeframe === '1'
              && document
                .querySelector('[data-layout-pane][data-pane-id="primary"] [data-chart-ohlc-timeframe]')
                ?.textContent === '1H'
              && document
                .querySelector('[data-layout-pane][data-pane-id="secondary"] [data-chart-ohlc-timeframe]')
                ?.textContent === '1m';
          });

          clickPaneCenterNow('secondary');
          timeframeSelect.value = '5';
          timeframeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          await waitFor('secondary immediate timeframe independent', async () => {
            const layoutState = await commands.dispatchCommand('layout.getState');
            return effectivePaneTimeframes(layoutState)[0] === 60
              && effectivePaneTimeframes(layoutState)[1] === 5
              && canvasFor('primary')?.dataset.displayTimeframe === '60'
              && canvasFor('secondary')?.dataset.displayTimeframe === '5'
              && document
                .querySelector('[data-layout-pane][data-pane-id="primary"] [data-chart-ohlc-timeframe]')
                ?.textContent === '1H'
              && document
                .querySelector('[data-layout-pane][data-pane-id="secondary"] [data-chart-ohlc-timeframe]')
                ?.textContent === '5m'
              && document.querySelector('[data-display-timeframe-select]')?.value === '5';
          });

          document.querySelector('[data-chart-go-to-open]')?.click();
          await waitFor('go-to open', async () =>
            document.querySelector('[data-chart-go-to-popover]')?.hidden === false
          );
          const goToInput = document.querySelector('[data-chart-go-to-input]');
          goToInput.value = '2026-06-01T09:45';
          goToInput.dispatchEvent(new Event('input', { bubbles: true }));
          document.querySelector('[data-chart-go-to]')?.click();
          await waitFor('go-to targets active secondary pane', async () => (
            canvasFor('primary')?.dataset.interactionMode === 'follow'
            && canvasFor('secondary')?.dataset.interactionMode === 'manual'
          ));

          await commands.dispatchCommand('chart.setManualVisibleRange', {
            paneId: 'primary',
            from: '2026-06-01T06:00:00.000Z',
            to: '2026-06-01T10:00:00.000Z',
          });
          await waitFor('primary set manual before secondary reset', async () => (
            canvasFor('primary')?.dataset.interactionMode === 'manual'
            && canvasFor('secondary')?.dataset.interactionMode === 'manual'
          ));
          document
            .querySelector('[data-layout-pane][data-pane-id="secondary"] [data-chart-reset-view]')
            ?.click();
          await waitFor('secondary reset is pane-local', async () => (
            canvasFor('primary')?.dataset.interactionMode === 'manual'
            && canvasFor('secondary')?.dataset.interactionMode === 'follow'
          ));

          await commands.dispatchCommand('chart.setManualVisibleRange', {
            paneId: 'secondary',
            from: '2026-06-01T09:25:00.000Z',
            to: '2026-06-01T09:50:00.000Z',
          });
          await waitFor('secondary set manual before jump cursor', async () => (
            canvasFor('secondary')?.dataset.interactionMode === 'manual'
          ));
          await clickPaneCenter('secondary');
          await waitFor('secondary active before jump cursor', async () => (
            document.querySelector('[data-route="chart"]')?.dataset.activePaneId === 'secondary'
          ));
          await checkpoint('before jump cursor');
          document.querySelector('[data-chart-go-to-open]')?.click();
          await waitFor('go-to open before jump cursor', async () =>
            document.querySelector('[data-chart-go-to-popover]')?.hidden === false
          );
          await checkpoint('after go-to open before jump cursor');
          document.querySelector('[data-chart-jump-cursor-popover]')?.click();
          await waitFor('jump cursor targets active secondary pane', async () => (
            canvasFor('primary')?.dataset.interactionMode === 'manual'
            && canvasFor('secondary')?.dataset.interactionMode === 'follow'
          ));
          await checkpoint('after jump cursor');

          const layoutState = await commands.dispatchCommand('layout.getState');
          return JSON.stringify({
            error: '',
            activePaneId: document.querySelector('[data-route="chart"]')?.dataset.activePaneId || '',
            selectValue: document.querySelector('[data-display-timeframe-select]')?.value || '',
            paneDisplayTimeframes: effectivePaneTimeframes(layoutState),
            primaryInteraction: canvasFor('primary')?.dataset.interactionMode || '',
            secondaryInteraction: canvasFor('secondary')?.dataset.interactionMode || '',
            primaryTf: canvasFor('primary')?.dataset.displayTimeframe || '',
            secondaryTf: canvasFor('secondary')?.dataset.displayTimeframe || '',
            checkpoints,
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        } finally {
          window.fetch = originalFetch;
        }
      })()
    `));

    assert.equal(value.error, '', value.error || 'browser smoke failed');
    assert.equal(value.activePaneId, 'secondary', JSON.stringify(value.checkpoints));
    assert.equal(value.selectValue, '5');
    assert.deepEqual(value.paneDisplayTimeframes, [60, 5]);
    assert.equal(value.primaryTf, '60');
    assert.equal(value.secondaryTf, '5');
    assert.equal(value.primaryInteraction, 'manual');
    assert.equal(value.secondaryInteraction, 'follow');
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

console.log('v5 multi-pane active pane browser smoke passed');
