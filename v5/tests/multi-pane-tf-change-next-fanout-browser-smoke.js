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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9424);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-multi-pane-tf-change-next-${process.pid}`;

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
          requests.push({
            paneId: parsed.searchParams.get('paneId') || '',
            timeframe,
            startText,
            endText,
          });
          const bars = [];
          for (let timestamp = start; timestamp <= end; timestamp += stepSeconds) {
            const index = Math.round((timestamp - start) / stepSeconds);
            const open = 30000 + index * Math.max(1, timeframe / 2) + Math.sin(index / 4) * 6;
            bars.push({
              timestamp,
              open,
              high: open + 5,
              low: open - 5,
              close: open + (index % 2 ? -2 : 2),
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
            viewportFollow: canvas?.dataset.viewportFollow || '',
            viewportCursorTimestamp: Number(canvas?.dataset.viewportCursorTimestamp || 0),
          };
        }

        function timestampSeconds(value) {
          if (typeof value === 'number') return value;
          const parsed = Date.parse(String(value || ''));
          return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : 0;
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

        async function wheelPane(paneId, deltaY) {
          const canvas = canvasFor(paneId);
          const box = canvas.getBoundingClientRect();
          canvas.dispatchEvent(new WheelEvent('wheel', {
            bubbles: true,
            cancelable: true,
            deltaY,
            clientX: Math.round(box.left + box.width / 2),
            clientY: Math.round(box.top + box.height / 2),
          }));
          await new Promise((resolve) => setTimeout(resolve, 220));
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-multi-pane-tf-change-next-fanout',
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
          document.querySelector('[data-layout-variant-option="triple.horizontal"]')?.click();
          await waitFor('three panes ready', async () => (
            document.querySelector('[data-route="chart"]')?.dataset.layoutVariant === 'triple.horizontal'
            && paneState('primary').renderedBarCount > 0
            && paneState('secondary').renderedBarCount > 0
            && paneState('tertiary').renderedBarCount > 0
          ));

          await clickPaneCenter('secondary');
          const timeframeSelect = document.querySelector('[data-display-timeframe-select]');
          timeframeSelect.value = '60';
          timeframeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          await waitFor('secondary 1H others 1m', async () => (
            paneState('primary').displayTimeframe === '1'
            && paneState('primary').renderedBarCount > 0
            && paneState('secondary').displayTimeframe === '60'
            && paneState('secondary').renderedBarCount > 0
            && paneState('tertiary').displayTimeframe === '1'
            && paneState('tertiary').renderedBarCount > 0
          ), 12000);

          await wheelPane('secondary', -260);
          await clickPaneCenter('primary');
          await wheelPane('primary', 260);
          await clickPaneCenter('secondary');
          await wheelPane('secondary', -180);
          await clickPaneCenter('tertiary');
          await wheelPane('tertiary', 160);
          await clickPaneCenter('primary');

          const beforeReplay = await commands.dispatchCommand('replay.getState');
          const before = {
            cursorTimestamp: timestampSeconds(beforeReplay.cursorTimestamp),
            primary: paneState('primary'),
            secondary: paneState('secondary'),
            tertiary: paneState('tertiary'),
          };
          const afterReplay = await commands.dispatchCommand('replay.next', { sessionId: created.session.id });
          const afterReplayCursor = timestampSeconds(afterReplay.cursorTimestamp);
          if (afterReplayCursor <= before.cursorTimestamp) {
            throw new Error('replay cursor did not advance after tf change');
          }
          const immediateAfter = {
            primary: paneState('primary'),
            secondary: paneState('secondary'),
            tertiary: paneState('tertiary'),
          };
          if (immediateAfter.secondary.viewportCursorTimestamp < afterReplayCursor) {
            throw new Error('different-timeframe pane projected after replay.next returned ' + JSON.stringify({
              afterReplayCursor,
              immediateAfter,
            }));
          }
          await waitFor('all panes remain responsive after next', async () => (
            paneState('primary').displayTimeframe === '1'
            && paneState('primary').renderedBarCount > 0
            && paneState('secondary').displayTimeframe === '60'
            && paneState('secondary').renderedBarCount > 0
            && paneState('tertiary').displayTimeframe === '1'
            && paneState('tertiary').renderedBarCount > 0
            && paneState('primary').viewportCursorTimestamp >= afterReplayCursor
            && paneState('secondary').viewportCursorTimestamp >= afterReplayCursor
            && paneState('tertiary').viewportCursorTimestamp >= timestampSeconds(afterReplay.cursorTimestamp)
          ), 12000);

          return JSON.stringify({
            error: '',
            before,
            afterReplayCursor,
            immediateAfter,
            after: {
              primary: paneState('primary'),
              secondary: paneState('secondary'),
              tertiary: paneState('tertiary'),
              selectValue: document.querySelector('[data-display-timeframe-select]')?.value || '',
            },
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
    assert.ok(value.afterReplayCursor > value.before.cursorTimestamp, JSON.stringify(value));
    assert.equal(value.after.primary.displayTimeframe, '1', JSON.stringify(value));
    assert.equal(value.after.secondary.displayTimeframe, '60', JSON.stringify(value));
    assert.equal(value.after.tertiary.displayTimeframe, '1', JSON.stringify(value));
    assert.ok(value.after.primary.renderedBarCount > 0, JSON.stringify(value));
    assert.ok(value.after.secondary.renderedBarCount > 0, JSON.stringify(value));
    assert.ok(value.after.tertiary.renderedBarCount > 0, JSON.stringify(value));
    assert.ok(value.immediateAfter.secondary.viewportCursorTimestamp >= value.afterReplayCursor, JSON.stringify(value));
    assert.ok(value.after.primary.viewportCursorTimestamp >= value.afterReplayCursor, JSON.stringify(value));
    assert.ok(value.after.secondary.viewportCursorTimestamp >= value.afterReplayCursor, JSON.stringify(value));
    assert.ok(value.after.tertiary.viewportCursorTimestamp >= value.afterReplayCursor, JSON.stringify(value));
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

console.log('v5 multi-pane tf-change next fanout browser smoke passed');
