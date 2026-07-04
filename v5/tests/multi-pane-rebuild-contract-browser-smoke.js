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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9392);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-multi-pane-rebuild-contract-${process.pid}`;

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
            const wave = Math.sin(index / 5) * 12;
            const open = 30300 + wave + index * 0.2;
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

        const variants = [
          { variant: 'twice.vertical', mode: 'twice', panes: 2, expectedActivePaneId: 'secondary' },
          { variant: 'twice.horizontal', mode: 'twice', panes: 2, expectedActivePaneId: 'primary' },
          { variant: 'triple.vertical', mode: 'triple', panes: 3, expectedActivePaneId: 'tertiary' },
          { variant: 'triple.horizontal', mode: 'triple', panes: 3, expectedActivePaneId: 'primary' },
          { variant: 'triple.left', mode: 'triple', panes: 3, expectedActivePaneId: 'secondary' },
          { variant: 'triple.right', mode: 'triple', panes: 3, expectedActivePaneId: 'primary' },
          { variant: 'triple.top', mode: 'triple', panes: 3, expectedActivePaneId: 'primary' },
          { variant: 'triple.bottom', mode: 'triple', panes: 3, expectedActivePaneId: 'secondary' },
        ];

        function paneMetrics() {
          return Array.from(document.querySelectorAll('[data-layout-pane]')).map((pane) => {
            const canvas = pane.querySelector('[data-chart-canvas]');
            return {
              paneId: pane.dataset.paneId || '',
              active: pane.dataset.activePane || '',
              hasChartHost: pane.dataset.hasChartHost || '',
              fullBarCount: Number(canvas?.dataset.fullBarCount || 0),
              renderedBarCount: Number(canvas?.dataset.renderedBarCount || 0),
              displayTimeframe: canvas?.dataset.displayTimeframe || '',
              priceScaleVisible: canvas?.dataset.priceScaleVisible || '',
              timeScaleVisible: canvas?.dataset.timeScaleVisible || '',
            };
          });
        }

        async function waitFor(label, predicate, timeoutMs = 4_000) {
          const deadline = Date.now() + timeoutMs;
          while (Date.now() < deadline) {
            const result = await predicate();
            if (result) return result;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          throw new Error('waitFor timed out: ' + label);
        }

        async function animationFrames(count = 4) {
          for (let index = 0; index < count; index += 1) {
            await new Promise((resolve) => requestAnimationFrame(resolve));
          }
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-multi-pane-rebuild-contract',
            instrument: 'NQ',
            timeframe: 1,
            sessionStart: '2026-06-01 09:30',
            sessionEnd: '2026-06-01 10:30',
          });
          await commands.dispatchCommand('app.navigate', {
            routeId: 'chart',
            params: { sessionId: created.session.id },
          });
          await waitFor('initial replay loaded', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.status === 'initial-loaded'
              && Number(document.querySelector('[data-chart-canvas]')?.dataset.renderedBarCount || 0) > 0;
          });

          const results = [];
          for (const spec of variants) {
            await commands.dispatchCommand('layout.setMode', {
              mode: 'single',
              variant: 'single.default',
            });
            await waitFor('single layout before ' + spec.variant, async () => (
              document.querySelector('[data-route="chart"]')?.dataset.layoutMode === 'single'
              && document.querySelectorAll('[data-layout-pane]').length === 1
            ));

            await commands.dispatchCommand('layout.setMode', {
              mode: spec.mode,
              variant: spec.variant,
            });
            await waitFor('layout pane count for ' + spec.variant, async () => (
              document.querySelector('[data-route="chart"]')?.dataset.layoutVariant === spec.variant
              && document.querySelectorAll('[data-layout-pane]').length === spec.panes
              && document.querySelectorAll('[data-chart-host]').length === spec.panes
            ));
            await animationFrames();

            let ready = true;
            try {
              await waitFor('all panes rendered for ' + spec.variant, async () => {
                const metrics = paneMetrics();
                return metrics.length === spec.panes
                  && metrics.every((pane) => pane.fullBarCount > 0)
                  && metrics.every((pane) => pane.renderedBarCount > 0);
              }, 3_000);
            } catch {
              ready = false;
            }

            const layoutState = await commands.dispatchCommand('layout.getState');
            const metrics = paneMetrics();
            results.push({
              variant: spec.variant,
              expectedActivePaneId: spec.expectedActivePaneId,
              actualActivePaneId: layoutState.activePaneId,
              routeActivePaneId: document.querySelector('[data-route="chart"]')?.dataset.activePaneId || '',
              paneCount: metrics.length,
              chartHostCount: document.querySelectorAll('[data-chart-host]').length,
              allPanesReady: ready,
              panes: metrics,
              renderedEmptyPanes: metrics
                .filter((pane) => pane.fullBarCount > 0 && pane.renderedBarCount === 0)
                .map((pane) => pane.paneId),
            });
          }

          return JSON.stringify({ error: '', results });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error), results: [] });
        } finally {
          window.fetch = originalFetch;
        }
      })()
    `));

    assert.equal(value.error, '', value.error || 'browser smoke failed');
    const failures = [];
    for (const result of value.results) {
      if (result.actualActivePaneId !== result.expectedActivePaneId) {
        failures.push(`${result.variant}: expected active ${result.expectedActivePaneId}, got ${result.actualActivePaneId}`);
      }
      if (result.routeActivePaneId !== result.expectedActivePaneId) {
        failures.push(`${result.variant}: route active expected ${result.expectedActivePaneId}, got ${result.routeActivePaneId}`);
      }
      if (result.paneCount !== result.panes.length || result.chartHostCount !== result.panes.length) {
        failures.push(`${result.variant}: pane/host count mismatch ${JSON.stringify({
          paneCount: result.paneCount,
          chartHostCount: result.chartHostCount,
          metricCount: result.panes.length,
        })}`);
      }
      if (!result.allPanesReady) {
        failures.push(`${result.variant}: not all panes reached rendered readiness ${JSON.stringify(result.panes)}`);
      }
      if (result.renderedEmptyPanes.length) {
        failures.push(`${result.variant}: panes have data but no rendered bars ${result.renderedEmptyPanes.join(',')}`);
      }
    }
    assert.deepEqual(failures, []);
    console.log('v5 multi-pane rebuild contract browser smoke passed');
  } finally {
    if (client) {
      client.close();
    }
    if (chrome) {
      chrome.kill('SIGTERM');
      await waitForProcessExit(chrome, 5_000).catch(() => chrome.kill('SIGKILL'));
    }
    web.kill('SIGTERM');
    await waitForProcessExit(web, 5_000).catch(() => web.kill('SIGKILL'));
    await rm(PROFILE_DIR, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
