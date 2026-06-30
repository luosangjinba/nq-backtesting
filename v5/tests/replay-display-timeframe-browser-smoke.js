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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9374);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-display-timeframe-browser-smoke-${process.pid}`;

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
          requests.push({
            timeframe,
            start: startText,
            end: endText,
          });
          const start = Date.parse(startText.replace(' ', 'T') + ':00.000Z') / 1000;
          const end = Date.parse(endText.replace(' ', 'T') + ':00.000Z') / 1000;
          const bars = [];
          for (let timestamp = start; timestamp <= end; timestamp += stepSeconds) {
            const index = Math.round((timestamp - start) / stepSeconds);
            const open = 200 + index;
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

        async function waitFor(label, predicate, timeoutMs = 8000) {
          const deadline = Date.now() + timeoutMs;
          while (Date.now() < deadline) {
            const value = await predicate();
            if (value) return value;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          const state = await window.__v5Commands?.dispatchCommand('replay.getState').catch(() => null);
          const displayContext = await window.__v5Commands?.dispatchCommand('replay.getDisplayContext').catch(() => null);
          throw new Error('waitFor timed out: ' + label + ' ' + JSON.stringify({
            state,
            displayContext,
            statusText: document.querySelector('[data-replay-load-status]')?.textContent || '',
            selected: document.querySelector('[data-display-timeframe-select]')?.value || '',
          }));
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          window.__v5Commands = commands;
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-display-timeframe',
            instrument: 'NQ',
            timeframe: 1,
            sessionStart: '2026-06-01T09:30:00.000Z',
            sessionEnd: '2026-06-01T09:40:00.000Z',
          });
          await commands.dispatchCommand('app.navigate', {
            routeId: 'chart',
            params: { sessionId: created.session.id },
          });

          await waitFor('initial display controls enabled', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            const select = document.querySelector('[data-display-timeframe-select]');
            return state.status === 'initial-loaded' && select && !select.disabled;
          });

          const timeframeSelect = document.querySelector('[data-display-timeframe-select]');
          timeframeSelect.value = '5';
          timeframeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          await waitFor('5m display loaded', async () => {
            const displayContext = await commands.dispatchCommand('replay.getDisplayContext');
            const selected = document.querySelector('[data-display-timeframe-select]')?.value;
            return displayContext?.displayTimeframe === 5
              && selected === '5'
              && document.querySelector('[data-replay-next]')?.disabled === false;
          });

          const beforeNextContext = await commands.dispatchCommand('replay.getDisplayContext');
          const requestCountBeforeNext = requests.length;
          document.querySelector('[data-replay-next]').click();
          await waitFor('next projects 5m display', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            const displayContext = await commands.dispatchCommand('replay.getDisplayContext');
            return state.cursorTimestamp === '2026-06-01T09:31:00.000Z'
              && displayContext.displayTimeframe === 5
              && displayContext.displayBars.every((bar) => bar.timestamp % (5 * 60) === 0)
              && !displayContext.displayBars.some((bar) => bar.timestamp === Date.parse('2026-06-01T09:31:00.000Z') / 1000);
          });

          const state = await commands.dispatchCommand('replay.getState');
          const displayContext = await commands.dispatchCommand('replay.getDisplayContext');
          const chartBarCountElement = document.querySelector('[data-chart-bar-count]');
          const chartCount = Number(chartBarCountElement?.dataset.chartBarCount || 0);
          const fullChartCount = Number(chartBarCountElement?.dataset.fullChartBarCount || 0);
          const displayBars = displayContext.displayBars || [];
          const lastDisplayBar = displayBars.at(-1);
          const projectionRequests = requests.slice(requestCountBeforeNext);
          return JSON.stringify({
            error: '',
            stateDisplayTimeframe: state.displayTimeframe,
            contextDisplayTimeframe: displayContext.displayTimeframe,
            cursorTimestamp: state.cursorTimestamp,
            chartCount,
            fullChartCount,
            displayCount: displayBars.length,
            beforeNextDisplayCount: beforeNextContext.displayBars.length,
            lastDisplayTimestamp: lastDisplayBar?.timestamp || null,
            hasReplayOneMinuteBar: displayBars.some((bar) => bar.timestamp === Date.parse('2026-06-01T09:31:00.000Z') / 1000),
            allDisplayBarsOn5mBoundary: displayBars.every((bar) => bar.timestamp % (5 * 60) === 0),
            selected: document.querySelector('[data-display-timeframe-select]')?.value || '',
            statusText: document.querySelector('[data-replay-load-status]')?.textContent || '',
            requests,
            projectionRequests,
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        } finally {
          window.fetch = originalFetch;
        }
      })()
    `));

    assert.equal(value.error, '', value.error || 'browser smoke failed');
    assert.equal(value.stateDisplayTimeframe, 5);
    assert.equal(value.contextDisplayTimeframe, 5);
    assert.equal(value.cursorTimestamp, '2026-06-01T09:31:00.000Z');
    assert.equal(value.selected, '5');
    assert.equal(value.fullChartCount, value.displayCount);
    assert.ok(value.chartCount > 0, 'Chart should render a visible display-timeframe window');
    assert.ok(value.chartCount <= value.fullChartCount, 'Chart rendered bars should be a viewport subset');
    assert.equal(value.hasReplayOneMinuteBar, false, 'Next must not mix 1m replay bars into 5m display');
    assert.equal(value.allDisplayBarsOn5mBoundary, true, 'Display bars should remain 5m bars after Next');
    assert.equal(value.lastDisplayTimestamp, Date.parse('2026-06-01T09:25:00.000Z') / 1000);
    assert.equal(value.statusText, `Loaded ${value.displayCount} bars.`);
    assert.ok(value.requests.some((request) => request.timeframe === 5), '5m display load should request 5m bars');
    assert.ok(
      value.projectionRequests.every((request) => request.timeframe === 5),
      `Next projection should stay on 5m timeframe: ${JSON.stringify(value.projectionRequests)}`
    );
    assert.equal(
      value.requests.some((request) =>
        request.timeframe === 5
          && request.start === '2026-06-01 09:30'
          && request.end === '2026-06-01 09:40'
      ),
      false,
      'Display timeframe switch must not request the full session date range'
    );
    assert.equal(
      value.projectionRequests.some((request) =>
        request.start === '2026-06-01 09:30'
          && request.end === '2026-06-01 09:40'
      ),
      false,
      'Next display projection must not request the full session date range'
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
  () => console.log('v5 replay display timeframe browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
