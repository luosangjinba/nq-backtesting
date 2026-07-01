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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9383);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-chart-go-to-time-browser-smoke-${process.pid}`;

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
            titles: Array.from(document.querySelectorAll('.chart-candle')).map((item) => item.title),
            status: document.querySelector('[data-replay-load-status]')?.textContent || '',
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
            id: 'browser-chart-go-to-time',
            instrument: 'NQ',
            timeframe: 1,
            sessionStart: '2026-06-01 09:30',
            sessionEnd: '2026-06-01 09:40',
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
              && chart.follow === 'true';
          });
          document.querySelector('[data-chart-settings-open]').click();
          await waitFor('settings open', async () =>
            document.querySelector('[data-chart-settings-popover]')?.hidden === false
          );
          document.querySelector('[data-display-timezone="UTC"]').click();
          await waitFor('utc display timezone', async () => {
            const timezone = await commands.dispatchCommand('displayTimezone.get');
            return timezone.displayTimezone === 'UTC';
          });
          const before = await commands.dispatchCommand('replay.getState');
          const requestCountBeforeGo = requests.length;
          document.querySelector('[data-chart-go-to-open]').click();
          await waitFor('go-to popover open', async () => {
            return document.querySelector('[data-chart-go-to-popover]')?.hidden === false
              && document.querySelector('[data-chart-go-to-input]');
          });
          const input = document.querySelector('[data-chart-go-to-input]');
          input.value = '2026-06-01T13:29';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          document.querySelector('[data-chart-go-to]').click();
          await waitFor('go-to manual', async () => {
            const chart = chartSnapshot();
            const interaction = await commands.dispatchCommand('chart.getInteractionState');
            return chart.mode === 'manual'
              && chart.follow === 'false'
              && interaction.visibleRange?.to <= Date.parse(before.cursorTimestamp) / 1000
              && document.querySelector('[data-chart-go-to-popover]')?.hidden === true;
          });
          const afterGo = await commands.dispatchCommand('replay.getState');
          const afterGoInteraction = await commands.dispatchCommand('chart.getInteractionState');
          document.querySelector('[data-chart-go-to-open]').click();
          await waitFor('go-to popover reopen', async () => {
            return document.querySelector('[data-chart-go-to-popover]')?.hidden === false
              && document.querySelector('[data-chart-jump-cursor-popover]')?.disabled === false;
          });
          const topLevelCursorCount = document.querySelectorAll(
            '[data-replay-workstation-toolbar] [data-chart-jump-cursor]'
          ).length;
          const popoverJumpCursorText = document
            .querySelector('[data-chart-jump-cursor-popover]')
            ?.textContent
            ?.trim() || '';
          document.querySelector('[data-chart-jump-cursor-popover]').click();
          await waitFor('jump cursor follow', async () => {
            const chart = chartSnapshot();
            return chart.mode === 'follow'
              && chart.follow === 'true';
          });
          const afterJump = await commands.dispatchCommand('replay.getState');
          const afterJumpInteraction = await commands.dispatchCommand('chart.getInteractionState');
          return JSON.stringify({
            error: '',
            beforeCursor: before.cursorTimestamp,
            afterGoCursor: afterGo.cursorTimestamp,
            afterJumpCursor: afterJump.cursorTimestamp,
            beforeDisplayCount: before.displayBars.length,
            afterGoDisplayCount: afterGo.displayBars.length,
            afterJumpDisplayCount: afterJump.displayBars.length,
            afterGoMode: afterGoInteraction.interaction.mode,
            afterGoFollow: afterGoInteraction.viewportFollow.enabled,
            afterGoRightEdge: afterGoInteraction.visibleRange?.to || null,
            afterGoVisibleFrom: afterGoInteraction.visibleRange?.from || null,
            afterJumpMode: afterJumpInteraction.interaction.mode,
            afterJumpFollow: afterJumpInteraction.viewportFollow.enabled,
            topLevelCursorCount,
            popoverJumpCursorText,
            requestCountBeforeGo,
            requestCountAfterGo: requests.length,
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
    assert.equal(value.afterGoCursor, value.beforeCursor);
    assert.equal(value.afterJumpCursor, value.beforeCursor);
    assert.ok(value.afterGoDisplayCount >= value.beforeDisplayCount);
    assert.ok(value.afterJumpDisplayCount >= value.afterGoDisplayCount);
    assert.equal(value.afterGoMode, 'manual');
    assert.equal(value.afterGoFollow, false);
    assert.ok(value.afterGoRightEdge <= Date.parse(value.beforeCursor) / 1000);
    assert.ok(value.afterGoVisibleFrom <= Date.parse('2026-06-01T09:29:00.000Z') / 1000);
    assert.ok(value.afterGoRightEdge >= Date.parse('2026-06-01T09:29:00.000Z') / 1000);
    assert.equal(value.afterJumpMode, 'follow');
    assert.equal(value.afterJumpFollow, true);
    assert.equal(value.topLevelCursorCount, 0);
    assert.equal(value.popoverJumpCursorText, 'Jump to replay cursor');
    assert.ok(value.requestCountAfterGo >= value.requestCountBeforeGo);
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
  () => console.log('v5 chart go-to time browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
