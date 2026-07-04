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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9398);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-settings-polish-browser-smoke-${process.pid}`;

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
      '--window-size=1440,960',
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
            const open = 1000 + index;
            bars.push({
              timestamp,
              open,
              high: open + 2,
              low: open - 2,
              close: open + (index % 2 ? -0.5 : 0.5),
            });
          }
          return new Response(JSON.stringify({ bars }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        };

        function rect(selector) {
          const box = document.querySelector(selector)?.getBoundingClientRect();
          return {
            width: Math.round(box?.width || 0),
            height: Math.round(box?.height || 0),
          };
        }

        async function waitFor(label, predicate, timeoutMs = 8000) {
          const deadline = Date.now() + timeoutMs;
          while (Date.now() < deadline) {
            const value = await predicate();
            if (value) return value;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          throw new Error('waitFor timed out: ' + label + ' ' + JSON.stringify({
            statusText: document.querySelector('[data-replay-load-status]')?.textContent || '',
            settingsHidden: document.querySelector('[data-chart-settings-popover]')?.hidden,
            selectedTab: document.querySelector('[data-chart-settings-tab][aria-selected="true"]')?.dataset.chartSettingsTab || '',
          }));
        }

        const commands = await import('/v5/src/runtime/commands.js');
        const created = await commands.dispatchCommand('session.create', {
          id: 'browser-settings-polish',
          instrument: 'NQ',
          timeframe: 1,
          sessionStart: '2026-06-01T09:30:00.000Z',
          sessionEnd: '2026-06-01T09:45:00.000Z',
        });
        await commands.dispatchCommand('app.navigate', {
          routeId: 'chart',
          params: { sessionId: created.session.id },
        });
        await waitFor('initial loaded', async () => {
          const state = await commands.dispatchCommand('replay.getState');
          return state.status === 'initial-loaded';
        });

        const canvas = document.querySelector('[data-chart-canvas]');
        const beforeBodyUp = canvas?.dataset.candleBodyUp || '';

        document.querySelector('[data-chart-settings-open]').click();
        await waitFor('settings open', () =>
          document.querySelector('[data-chart-settings-popover]')?.hidden === false
        );

        const panel = document.querySelector('.chart-settings-panel');
        const panelMetrics = rect('.chart-settings-panel');
        const panelStyle = getComputedStyle(panel);
        const bodyStyle = getComputedStyle(document.querySelector('.chart-settings-body'));
        const selectedTab = document.querySelector('[data-chart-settings-tab="symbol"]');
        const inactiveTab = document.querySelector('[data-chart-settings-tab="canvas"]');
        const selectedStyle = getComputedStyle(selectedTab);
        const inactiveStyle = getComputedStyle(inactiveTab);
        const tabs = Array.from(document.querySelectorAll('[data-chart-settings-tab]')).map((button) => ({
          id: button.id,
          role: button.getAttribute('role'),
          controls: button.getAttribute('aria-controls'),
          selected: button.getAttribute('aria-selected'),
          current: button.getAttribute('aria-current'),
          tabIndex: button.tabIndex,
        }));
        const sections = Array.from(document.querySelectorAll('[data-chart-settings-section]')).map((section) => ({
          id: section.id,
          role: section.getAttribute('role'),
          labelledBy: section.getAttribute('aria-labelledby'),
          hidden: section.hidden,
        }));

        document.dispatchEvent(new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'ArrowDown',
        }));
        await waitFor('keyboard tab switch', () =>
          document.querySelector('[data-chart-settings-tab="status"]')?.getAttribute('aria-selected') === 'true'
            && document.querySelector('[data-chart-settings-section="status"]')?.hidden === false
        );
        const selectedAfterArrow = document.querySelector('[data-chart-settings-tab][aria-selected="true"]')?.dataset.chartSettingsTab || '';

        document.querySelector('[data-chart-settings-tab="symbol"]').click();
        const bodyUpInput = document.querySelector('[data-candle-style="body.up"]');
        bodyUpInput.value = '#22c55e';
        bodyUpInput.dispatchEvent(new Event('input', { bubbles: true }));
        const bodyUpBeforeEscape = canvas?.dataset.candleBodyUp || '';
        document.dispatchEvent(new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Escape',
        }));
        await waitFor('settings closed by escape', () =>
          document.querySelector('[data-chart-settings-popover]')?.hidden === true
        );
        const bodyUpAfterEscape = canvas?.dataset.candleBodyUp || '';

        document.querySelector('[data-chart-settings-open]').click();
        await waitFor('settings reopen after escape', () =>
          document.querySelector('[data-chart-settings-popover]')?.hidden === false
        );
        const reopenedBodyUpInputValue = document.querySelector('[data-candle-style="body.up"]')?.value || '';
        document.querySelector('[data-candle-style="body.up"]').value = '#22c55e';
        document.querySelector('[data-candle-style="body.up"]').dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('[data-chart-settings-apply]').click();
        await waitFor('settings apply closed', () =>
          document.querySelector('[data-chart-settings-popover]')?.hidden === true
            && (canvas?.dataset.candleBodyUp || '') === '#22c55e'
        );

        return JSON.stringify({
          panel: rect('.chart-settings-panel'),
          panelMetrics,
          bodyGridColumns: bodyStyle.gridTemplateColumns,
          panelBorderRadius: panelStyle.borderRadius,
          panelBackground: panelStyle.backgroundColor,
          selectedTabBackground: selectedStyle.backgroundColor,
          inactiveTabBackground: inactiveStyle.backgroundColor,
          selectedTabColor: selectedStyle.color,
          inactiveTabColor: inactiveStyle.color,
          tabs,
          sections,
          selectedAfterArrow,
          beforeBodyUp,
          bodyUpBeforeEscape,
          bodyUpAfterEscape,
          reopenedBodyUpInputValue,
          appliedBodyUp: canvas?.dataset.candleBodyUp || '',
          settingsHiddenAfterApply: document.querySelector('[data-chart-settings-popover]')?.hidden === true,
        });
      })()
    `));

    assert.ok(value.panelMetrics.width >= 760, `settings panel should be wide enough: ${value.panelMetrics.width}`);
    assert.ok(value.panelMetrics.height >= 520, `settings panel should be tall enough: ${value.panelMetrics.height}`);
    assert.match(value.bodyGridColumns, /236px/);
    assert.match(value.bodyGridColumns, /minmax\(0px, 1fr\)|\d+px/);
    assert.notEqual(value.selectedTabBackground, value.inactiveTabBackground);
    assert.notEqual(value.selectedTabColor, value.inactiveTabColor);
    assert.equal(value.selectedAfterArrow, 'status');
    assert.equal(value.tabs.length, 4);
    assert.equal(value.sections.length, 4);
    assert.equal(value.tabs[0].role, 'tab');
    assert.equal(value.tabs[0].selected, 'true');
    assert.equal(value.tabs[0].tabIndex, 0);
    assert.equal(value.tabs[1].tabIndex, -1);
    assert.equal(value.sections[0].role, 'tabpanel');
    assert.equal(value.sections[0].hidden, false);
    assert.equal(value.bodyUpBeforeEscape, value.beforeBodyUp);
    assert.equal(value.bodyUpAfterEscape, value.beforeBodyUp);
    assert.equal(value.reopenedBodyUpInputValue, value.beforeBodyUp);
    assert.equal(value.appliedBodyUp, '#22c55e');
    assert.equal(value.settingsHiddenAfterApply, true);
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
  () => console.log('v5 settings polish browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
