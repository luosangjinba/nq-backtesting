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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9418);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-triple-pane-timeframe-isolation-${process.pid}`;

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
          };
        }

        async function layoutTimeframes(commands) {
          const layoutState = await commands.dispatchCommand('layout.getState');
          return Object.fromEntries(layoutState.panes.map((pane) => [
            pane.id,
            Number(pane.displayTimeframe || 1),
          ]));
        }

        async function waitFor(label, predicate, timeoutMs = 10000) {
          const deadline = performance.now() + timeoutMs;
          while (performance.now() < deadline) {
            const value = await predicate();
            if (value) return value;
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
          throw new Error('waitFor timed out: ' + label + ' ' + JSON.stringify({
            routeActivePaneId: document.querySelector('[data-route="chart"]')?.dataset.activePaneId || '',
            primary: paneState('primary'),
            secondary: paneState('secondary'),
            tertiary: paneState('tertiary'),
            selectValue: document.querySelector('[data-display-timeframe-select]')?.value || '',
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

        async function wheelPane(paneId) {
          const canvas = canvasFor(paneId);
          if (!canvas) throw new Error('Missing canvas ' + paneId);
          const box = canvas.getBoundingClientRect();
          const clientX = Math.round(box.left + box.width / 2);
          const clientY = Math.round(box.top + box.height / 2);
          canvas.dispatchEvent(new WheelEvent('wheel', {
            bubbles: true,
            cancelable: true,
            deltaY: -260,
            clientX,
            clientY,
          }));
          await new Promise((resolve) => setTimeout(resolve, 250));
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-triple-pane-timeframe-isolation',
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
          document.querySelector('[data-layout-variant-option="triple.vertical"]')?.click();
          await waitFor('triple panes ready', async () => (
            document.querySelector('[data-route="chart"]')?.dataset.layoutVariant === 'triple.vertical'
            && paneState('primary').fullBarCount > 0
            && paneState('secondary').fullBarCount > 0
            && paneState('tertiary').fullBarCount > 0
          ));

          const timeframeSelect = document.querySelector('[data-display-timeframe-select]');
          await clickPaneCenter('secondary');
          await waitFor('secondary active before 5m', async () => (
            document.querySelector('[data-route="chart"]')?.dataset.activePaneId === 'secondary'
          ));
          timeframeSelect.value = '5';
          timeframeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          await waitFor('secondary 5m primary tertiary unchanged', async () => {
            const frames = await layoutTimeframes(commands);
            return frames.primary === 1
              && frames.secondary === 5
              && frames.tertiary === 1
              && paneState('secondary').displayTimeframe === '5'
              && paneState('tertiary').displayTimeframe === '1';
          });

          await clickPaneCenter('primary');
          await waitFor('primary active before 1H', async () => (
            document.querySelector('[data-route="chart"]')?.dataset.activePaneId === 'primary'
          ));
          timeframeSelect.value = '60';
          timeframeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          await waitFor('primary 1H others unchanged before wheel', async () => {
            const frames = await layoutTimeframes(commands);
            return frames.primary === 60
              && frames.secondary === 5
              && frames.tertiary === 1
              && paneState('primary').displayTimeframe === '60'
              && paneState('secondary').displayTimeframe === '5'
              && paneState('tertiary').displayTimeframe === '1';
          });

          const beforeWheel = {
            frames: await layoutTimeframes(commands),
            primary: paneState('primary'),
            secondary: paneState('secondary'),
            tertiary: paneState('tertiary'),
          };
          await wheelPane('primary');
          await waitFor('primary wheel retains pane-local timeframes', async () => {
            const frames = await layoutTimeframes(commands);
            return frames.primary === 60
              && frames.secondary === 5
              && frames.tertiary === 1
              && paneState('primary').displayTimeframe === '60'
              && paneState('secondary').displayTimeframe === '5'
              && paneState('tertiary').displayTimeframe === '1';
          });
          const afterWheel = {
            frames: await layoutTimeframes(commands),
            primary: paneState('primary'),
            secondary: paneState('secondary'),
            tertiary: paneState('tertiary'),
            selectValue: document.querySelector('[data-display-timeframe-select]')?.value || '',
          };
          return JSON.stringify({
            error: '',
            beforeWheel,
            afterWheel,
            requests,
          });
        } catch (error) {
          return JSON.stringify({
            error: error?.stack || error?.message || String(error),
            primary: paneState('primary'),
            secondary: paneState('secondary'),
            tertiary: paneState('tertiary'),
            requests,
          });
        } finally {
          window.fetch = originalFetch;
        }
      })();
    `));

    assert.equal(value.error, '', value.error ? JSON.stringify(value) : 'browser smoke failed');
    assert.deepEqual(value.beforeWheel.frames, { primary: 60, secondary: 5, tertiary: 1 });
    assert.deepEqual(value.afterWheel.frames, { primary: 60, secondary: 5, tertiary: 1 }, JSON.stringify(value));
    assert.equal(value.afterWheel.primary.displayTimeframe, '60', JSON.stringify(value));
    assert.equal(value.afterWheel.secondary.displayTimeframe, '5', JSON.stringify(value));
    assert.equal(value.afterWheel.tertiary.displayTimeframe, '1', JSON.stringify(value));
    assert.equal(value.afterWheel.selectValue, '60', JSON.stringify(value));
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

console.log('v5 triple pane timeframe isolation browser smoke passed');
