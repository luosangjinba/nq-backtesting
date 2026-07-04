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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9387);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-replay-workstation-layout-browser-smoke-${process.pid}`;

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
            const open = 30000 + index;
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

        function rect(selector) {
          const box = document.querySelector(selector)?.getBoundingClientRect();
          return {
            top: Math.round(box?.top || 0),
            left: Math.round(box?.left || 0),
            right: Math.round(box?.right || 0),
            bottom: Math.round(box?.bottom || 0),
            width: Math.round(box?.width || 0),
            height: Math.round(box?.height || 0),
          };
        }

        function elementRect(element) {
          const box = element?.getBoundingClientRect();
          return {
            top: Math.round(box?.top || 0),
            left: Math.round(box?.left || 0),
            right: Math.round(box?.right || 0),
            bottom: Math.round(box?.bottom || 0),
            width: Math.round(box?.width || 0),
            height: Math.round(box?.height || 0),
          };
        }

        function paneResizeMetrics() {
          return Array
            .from(document.querySelectorAll('[data-layout-pane]'))
            .map((pane) => {
              const host = pane.querySelector('[data-chart-host]');
              const canvas = pane.querySelector('[data-chart-canvas]');
              const surface = pane.querySelector('[data-chart-engine-surface]');
              return {
                paneId: pane.dataset.paneId || '',
                host: elementRect(host),
                canvas: elementRect(canvas),
                surface: elementRect(surface),
                resizeWidth: Number(host?.dataset.chartResizeWidth || 0),
                resizeHeight: Number(host?.dataset.chartResizeHeight || 0),
                canvasResizeWidth: Number(canvas?.dataset.chartResizeWidth || 0),
                canvasResizeHeight: Number(canvas?.dataset.chartResizeHeight || 0),
                surfaceResizeWidth: Number(surface?.dataset.chartResizeWidth || 0),
                surfaceResizeHeight: Number(surface?.dataset.chartResizeHeight || 0),
              };
            });
        }

        function splitHandleMetrics() {
          return Array
            .from(document.querySelectorAll('[data-layout-split-handle]'))
            .map((handle) => ({
              id: handle.dataset.layoutSplitHandle || '',
              firstPaneId: handle.dataset.firstPaneId || '',
              secondPaneId: handle.dataset.secondPaneId || '',
              orientation: handle.getAttribute('aria-orientation') || '',
              hidden: Boolean(handle.hidden),
              rect: elementRect(handle),
            }));
        }

        async function dragSplitHandle(id, clientPosition) {
          const handle = document.querySelector('[data-layout-split-handle="' + id + '"]');
          if (!handle) throw new Error('Missing split handle ' + id);
          const box = handle.getBoundingClientRect();
          const vertical = handle.getAttribute('aria-orientation') === 'vertical';
          const startX = Math.round(box.left + box.width / 2);
          const startY = Math.round(box.top + box.height / 2);
          const pointerId = 479;
          handle.dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            button: 0,
            pointerId,
            clientX: startX,
            clientY: startY,
          }));
          handle.dispatchEvent(new PointerEvent('pointermove', {
            bubbles: true,
            cancelable: true,
            button: 0,
            pointerId,
            clientX: vertical ? clientPosition : startX,
            clientY: vertical ? startY : clientPosition,
          }));
          handle.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true,
            cancelable: true,
            button: 0,
            pointerId,
            clientX: vertical ? clientPosition : startX,
            clientY: vertical ? startY : clientPosition,
          }));
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }

        async function clickPaneCenter(paneId) {
          const pane = document.querySelector('[data-layout-pane][data-pane-id="' + paneId + '"]');
          if (!pane) throw new Error('Missing pane ' + paneId);
          const box = pane.getBoundingClientRect();
          const clientX = Math.round(box.left + box.width / 2);
          const clientY = Math.round(box.top + box.height / 2);
          const target = document.elementFromPoint(clientX, clientY) || pane;
          target.dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            button: 0,
            pointerId: 480,
            clientX,
            clientY,
          }));
          target.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true,
            cancelable: true,
            button: 0,
            pointerId: 480,
            clientX,
            clientY,
          }));
          target.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            button: 0,
            clientX,
            clientY,
          }));
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
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
            toolbar: rect('[data-replay-workstation-toolbar]'),
            chart: rect('[data-chart-host]'),
            footer: rect('[data-replay-footer]'),
          }));
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-replay-workstation-layout',
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
              && document.querySelector('[data-chart-host]')?.dataset.chartEngine === 'lightweight-charts'
              && document.querySelector('[data-replay-footer]');
          });

          const bodyText = document.body.innerText;
          const toolbarRect = rect('[data-replay-workstation-toolbar]');
          const headingRect = rect('.chart-route-heading');
          const headingActionsRect = rect('.chart-route-actions');
          const shellTopBarRect = rect('.top-bar');
          const shellTopBarDisplay = getComputedStyle(document.querySelector('.top-bar')).display;
          const workspaceRect = rect('.workspace');
          const panelTitle = document.querySelector('.chart-panel h2')?.textContent || '';
          const badgeText = document.querySelector('.chart-panel .runtime-badge')?.textContent || '';
          const chartRoute = document.querySelector('[data-route="chart"]');
          const chartViewport = document.querySelector('.chart-viewport');
          const chartHost = document.querySelector('[data-chart-host]');
          const timeframeControlRect = rect('[data-display-timeframe-controls]');
          const goToRect = rect('[data-chart-go-to-open]');
          const settingsRect = rect('[data-chart-settings-open]');
          const layoutButton = document.querySelector('[data-layout-open]');
          layoutButton?.click();
          await new Promise((resolve) => setTimeout(resolve, 50));
          const layoutPopover = document.querySelector('[data-layout-popover]');
          const singleModeButton = document.querySelector('[data-layout-mode-option="single"]');
          const twiceVerticalModeButton = document.querySelector('[data-layout-variant-option="twice.vertical"]');
          const twiceModeButton = document.querySelector('[data-layout-variant-option="twice.horizontal"]');
          const tripleLeftModeButton = document.querySelector('[data-layout-variant-option="triple.left"]');
          const tripleModeButton = document.querySelector('[data-layout-mode-option="triple"]');
          const layoutModeRows = Array.from(document.querySelectorAll('.chart-layout-mode-row'));
          const layoutModeButtons = Array.from(document.querySelectorAll('[data-layout-mode-option]'));
          const layoutVariantButtons = Array.from(document.querySelectorAll('[data-layout-variant-option]'));
          const layoutModeIconCount = document.querySelectorAll('.chart-layout-icon').length;
          const symbolSyncInput = document.querySelector('[data-layout-sync="symbol"]');
          const intervalSyncInput = document.querySelector('[data-layout-sync="interval"]');
          const crosshairSyncInput = document.querySelector('[data-layout-sync="crosshair"]');
          const timeSyncInput = document.querySelector('[data-layout-sync="time"]');
          const dateRangeSyncInput = document.querySelector('[data-layout-sync="dateRange"]');
          const layoutPopoverInitiallyVisible = Boolean(layoutPopover && !layoutPopover.hidden);
          const singleModeInitiallyPressed = singleModeButton?.getAttribute('aria-pressed') || '';
          twiceVerticalModeButton?.click();
          await waitFor('twice vertical layout mode', async () => (
            chartRoute?.dataset.layoutMode === 'twice'
            && chartRoute?.dataset.layoutVariant === 'twice.vertical'
            && document.querySelectorAll('[data-layout-pane]').length === 2
          ));
          await waitFor('twice vertical defaults to right active pane', async () => (
            chartRoute?.dataset.activePaneId === 'secondary'
            && document.querySelector('[data-layout-pane-shell]')?.dataset.activePaneId === 'secondary'
          ));
          const defaultVerticalActivePaneId = chartRoute?.dataset.activePaneId || '';
          const defaultVerticalPaneShellActivePaneId = document.querySelector('[data-layout-pane-shell]')?.dataset.activePaneId || '';
          const syncedNextPrimaryBefore = Number(document
            .querySelector('[data-layout-pane][data-pane-id="primary"] [data-chart-canvas]')
            ?.dataset.fullBarCount || 0);
          const syncedNextSecondaryBefore = Number(document
            .querySelector('[data-layout-pane][data-pane-id="secondary"] [data-chart-canvas]')
            ?.dataset.fullBarCount || 0);
          document.querySelector('[data-replay-next]')?.click();
          await waitFor('default panes both advance on replay next', async () => {
            const primaryCount = Number(document
              .querySelector('[data-layout-pane][data-pane-id="primary"] [data-chart-canvas]')
              ?.dataset.fullBarCount || 0);
            const secondaryCount = Number(document
              .querySelector('[data-layout-pane][data-pane-id="secondary"] [data-chart-canvas]')
              ?.dataset.fullBarCount || 0);
            return primaryCount > syncedNextPrimaryBefore
              && secondaryCount > syncedNextSecondaryBefore;
          });
          const syncedNextPrimaryAfter = Number(document
            .querySelector('[data-layout-pane][data-pane-id="primary"] [data-chart-canvas]')
            ?.dataset.fullBarCount || 0);
          const syncedNextSecondaryAfter = Number(document
            .querySelector('[data-layout-pane][data-pane-id="secondary"] [data-chart-canvas]')
            ?.dataset.fullBarCount || 0);
          await waitFor('secondary pane initialized with independent timeframe', async () => {
            const layoutState = await commands.dispatchCommand('layout.getState');
            const secondaryCanvas = document
              .querySelector('[data-layout-pane][data-pane-id="secondary"] [data-chart-canvas]');
            return layoutState.panes.find((pane) => pane.id === 'secondary')?.displayTimeframe === 1
              && secondaryCanvas?.dataset.displayTimeframe === '1'
              && Number(secondaryCanvas?.dataset.fullBarCount || 0) > 0;
          });
          const verticalPrimaryPane = document.querySelector('[data-layout-pane][data-pane-id="primary"]');
          verticalPrimaryPane?.click();
          await waitFor('primary active pane before independent primary TF change', async () => (
            chartRoute?.dataset.activePaneId === 'primary'
            && document.querySelector('[data-display-timeframe-select]')?.value === '1'
          ));
          const primaryDisplayTimeframeSelect = document.querySelector('[data-display-timeframe-select]');
          primaryDisplayTimeframeSelect.value = '5';
          primaryDisplayTimeframeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          await waitFor('primary TF change leaves secondary pane independent when interval sync is off', async () => {
            const layoutState = await commands.dispatchCommand('layout.getState');
            const primaryCanvas = document
              .querySelector('[data-layout-pane][data-pane-id="primary"] [data-chart-canvas]');
            const secondaryCanvas = document
              .querySelector('[data-layout-pane][data-pane-id="secondary"] [data-chart-canvas]');
            return intervalSyncInput?.checked === false
              && layoutState.panes.find((pane) => pane.id === 'primary')?.displayTimeframe === 5
              && layoutState.panes.find((pane) => pane.id === 'secondary')?.displayTimeframe === 1
              && primaryCanvas?.dataset.displayTimeframe === '5'
              && secondaryCanvas?.dataset.displayTimeframe === '1';
          });
          const verticalPrimaryIndependentLayoutState = await commands.dispatchCommand('layout.getState');
          const verticalPrimaryIndependentPrimaryDisplayTimeframe = document
            .querySelector('[data-layout-pane][data-pane-id="primary"] [data-chart-canvas]')
            ?.dataset.displayTimeframe || '';
          const verticalPrimaryIndependentSecondaryDisplayTimeframe = document
            .querySelector('[data-layout-pane][data-pane-id="secondary"] [data-chart-canvas]')
            ?.dataset.displayTimeframe || '';
          primaryDisplayTimeframeSelect.value = '1';
          primaryDisplayTimeframeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          await waitFor('primary TF reset before secondary pane checks', async () => {
            const layoutState = await commands.dispatchCommand('layout.getState');
            const primaryCanvas = document
              .querySelector('[data-layout-pane][data-pane-id="primary"] [data-chart-canvas]');
            return layoutState.panes.find((pane) => pane.id === 'primary')?.displayTimeframe === 1
              && primaryCanvas?.dataset.displayTimeframe === '1'
              && document.querySelector('[data-display-timeframe-select]')?.value === '1';
          });
          await clickPaneCenter('secondary');
          await waitFor('secondary active pane in vertical layout', async () => (
            chartRoute?.dataset.activePaneId === 'secondary'
            && document.querySelector('[data-display-timeframe-select]')?.value === '1'
          ));
          const verticalDisplayTimeframeSelect = document.querySelector('[data-display-timeframe-select]');
          verticalDisplayTimeframeSelect.value = '5';
          verticalDisplayTimeframeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          await waitFor('right vertical pane display timeframe updated independently', async () => {
            const layoutState = await commands.dispatchCommand('layout.getState');
            const displayContext = await commands.dispatchCommand('replay.getDisplayContext');
            const primaryCanvas = document
              .querySelector('[data-layout-pane][data-pane-id="primary"] [data-chart-canvas]');
            const secondaryCanvas = document
              .querySelector('[data-layout-pane][data-pane-id="secondary"] [data-chart-canvas]');
            return layoutState.variant === 'twice.vertical'
              && layoutState.panes.find((pane) => pane.id === 'primary')?.displayTimeframe === 1
              && layoutState.panes.find((pane) => pane.id === 'secondary')?.displayTimeframe === 5
              && displayContext.displayTimeframe === 1
              && primaryCanvas?.dataset.displayTimeframe === '1'
              && secondaryCanvas?.dataset.displayTimeframe === '5'
              && document.querySelector('[data-display-timeframe-select]')?.value === '5';
          });
          const verticalIndependentLayoutState = await commands.dispatchCommand('layout.getState');
          const verticalIndependentDisplayContext = await commands.dispatchCommand('replay.getDisplayContext');
          const verticalPrimaryRenderedBarCount = Number(document
            .querySelector('[data-layout-pane][data-pane-id="primary"] [data-chart-canvas]')
            ?.dataset.renderedBarCount || 0);
          const verticalSecondaryRenderedBarCount = Number(document
            .querySelector('[data-layout-pane][data-pane-id="secondary"] [data-chart-canvas]')
            ?.dataset.renderedBarCount || 0);
          twiceModeButton?.click();
          await waitFor('twice layout mode', async () => (
            chartRoute?.dataset.layoutMode === 'twice'
            && chartRoute?.dataset.layoutVariant === 'twice.horizontal'
            && document.querySelectorAll('[data-layout-pane]').length === 2
          ));
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const twiceHorizontalSplitHandles = splitHandleMetrics();
          const twiceHorizontalShellBeforeDrag = rect('[data-layout-pane-shell]');
          await dragSplitHandle('primary-secondary-y', twiceHorizontalShellBeforeDrag.top + 4);
          await waitFor('split ratio minimum wall after upward drag', async () => {
            const layoutState = await commands.dispatchCommand('layout.getState');
            const primary = document
              .querySelector('[data-layout-pane][data-pane-id="primary"]')
              ?.getBoundingClientRect();
            const secondary = document
              .querySelector('[data-layout-pane][data-pane-id="secondary"]')
              ?.getBoundingClientRect();
            return layoutState.split?.ratios?.primary >= 0.29
              && layoutState.split?.ratios?.secondary <= 1.71
              && primary?.height > twiceHorizontalShellBeforeDrag.height * 0.12
              && secondary?.height > twiceHorizontalShellBeforeDrag.height * 0.75;
          });
          const twiceHorizontalMinWallLayoutState = await commands.dispatchCommand('layout.getState');
          const twiceHorizontalMinWallPrimaryRect = rect('[data-layout-pane][data-pane-id="primary"]');
          const twiceHorizontalMinWallSecondaryRect = rect('[data-layout-pane][data-pane-id="secondary"]');
          await dragSplitHandle(
            'primary-secondary-y',
            twiceHorizontalShellBeforeDrag.top + twiceHorizontalShellBeforeDrag.height - 4
          );
          await waitFor('split ratio maximum wall after downward drag', async () => {
            const layoutState = await commands.dispatchCommand('layout.getState');
            const primary = document
              .querySelector('[data-layout-pane][data-pane-id="primary"]')
              ?.getBoundingClientRect();
            const secondary = document
              .querySelector('[data-layout-pane][data-pane-id="secondary"]')
              ?.getBoundingClientRect();
            return layoutState.split?.ratios?.primary <= 1.71
              && layoutState.split?.ratios?.secondary >= 0.29
              && primary?.height > twiceHorizontalShellBeforeDrag.height * 0.75
              && secondary?.height > twiceHorizontalShellBeforeDrag.height * 0.12;
          });
          const twiceHorizontalMaxWallLayoutState = await commands.dispatchCommand('layout.getState');
          const twiceHorizontalMaxWallPrimaryRect = rect('[data-layout-pane][data-pane-id="primary"]');
          const twiceHorizontalMaxWallSecondaryRect = rect('[data-layout-pane][data-pane-id="secondary"]');
          await dragSplitHandle(
            'primary-secondary-y',
            twiceHorizontalShellBeforeDrag.top + (twiceHorizontalShellBeforeDrag.height / 2)
          );
          await waitFor('split ratio restored near midpoint', async () => {
            const layoutState = await commands.dispatchCommand('layout.getState');
            return layoutState.split?.ratios?.primary > 0.9
              && layoutState.split?.ratios?.primary < 1.1
              && layoutState.split?.ratios?.secondary > 0.9
              && layoutState.split?.ratios?.secondary < 1.1;
          });
          const twiceHorizontalResizeMetrics = paneResizeMetrics();
          const secondaryPane = document.querySelector('[data-layout-pane][data-pane-id="secondary"]');
          secondaryPane?.click();
          await waitFor('secondary active pane', async () => chartRoute?.dataset.activePaneId === 'secondary');
          const activePaneIdAfterSecondarySelect = chartRoute?.dataset.activePaneId || '';
          const paneShellActivePaneIdAfterSecondarySelect = document.querySelector('[data-layout-pane-shell]')?.dataset.activePaneId || '';
          const primaryPaneActiveAfterSecondarySelect = document.querySelector('[data-layout-pane][data-pane-id="primary"]')?.dataset.activePane || '';
          const secondaryPaneActiveAfterSecondarySelect = secondaryPane?.dataset.activePane || '';
          const displayTimeframeSelect = document.querySelector('[data-display-timeframe-select]');
          displayTimeframeSelect.value = '5';
          displayTimeframeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          await waitFor('secondary display timeframe updated independently', async () => {
            const layoutState = await commands.dispatchCommand('layout.getState');
            return layoutState.panes.length === 2
              && layoutState.panes.find((pane) => pane.id === 'primary')?.displayTimeframe === 1
              && layoutState.panes.find((pane) => pane.id === 'secondary')?.displayTimeframe === 5
              && document.querySelector('[data-display-timeframe-select]')?.value === '5';
          });
          const layoutStateAfterIndependentTimeframe = await commands.dispatchCommand('layout.getState');
          const replayDisplayContextAfterIndependentTimeframe = await commands.dispatchCommand('replay.getDisplayContext');
          document.querySelector('[data-layout-pane][data-pane-id="primary"]')?.click();
          await waitFor('primary active pane timeframe reflected in shared select', async () => (
            chartRoute?.dataset.activePaneId === 'primary'
            && document.querySelector('[data-display-timeframe-select]')?.value === '1'
          ));
          const primarySelectValueAfterFocus = document.querySelector('[data-display-timeframe-select]')?.value || '';
          secondaryPane?.click();
          await waitFor('secondary active pane timeframe reflected in shared select', async () => (
            chartRoute?.dataset.activePaneId === 'secondary'
            && document.querySelector('[data-display-timeframe-select]')?.value === '5'
          ));
          const secondarySelectValueAfterFocus = document.querySelector('[data-display-timeframe-select]')?.value || '';
          timeSyncInput?.click();
          dateRangeSyncInput?.click();
          crosshairSyncInput?.click();
          await waitFor('time, date range, and crosshair sync enabled', async () => {
            const layoutState = await commands.dispatchCommand('layout.getState');
            return layoutState.sync.time === true
              && layoutState.sync.dateRange === true
              && layoutState.sync.crosshair === true;
          });
          intervalSyncInput?.click();
          await waitFor('interval sync enabled', async () => intervalSyncInput?.checked === true);
          displayTimeframeSelect.value = '10';
          displayTimeframeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          await waitFor('synced secondary display timeframe', async () => {
            const layoutState = await commands.dispatchCommand('layout.getState');
            const displayContext = await commands.dispatchCommand('replay.getDisplayContext');
            return layoutState.panes.length === 2
              && layoutState.panes.every((pane) => pane.displayTimeframe === 10)
              && displayContext.displayTimeframe === 10
              && document.querySelector('[data-display-timeframe-select]')?.value === '10';
          });
          const layoutStateAfterTimeframe = await commands.dispatchCommand('layout.getState');
          const replayDisplayContextAfterTimeframe = await commands.dispatchCommand('replay.getDisplayContext');
          document.querySelector('[data-layout-close]')?.click();
          document.querySelector('[data-chart-go-to-open]')?.click();
          await waitFor('go-to popover open for sync time', async () =>
            document.querySelector('[data-chart-go-to-popover]')?.hidden === false
          );
          const goToInput = document.querySelector('[data-chart-go-to-input]');
          goToInput.value = '2026-06-01T09:35';
          goToInput.dispatchEvent(new Event('input', { bubbles: true }));
          document.querySelector('[data-chart-go-to]')?.click();
          await waitFor('layout time synced', async () => {
            const layoutState = await commands.dispatchCommand('layout.getState');
            return layoutState.panes.length === 2
              && layoutState.panes.every((pane) => pane.time)
              && new Set(layoutState.panes.map((pane) => pane.time)).size === 1;
          });
          const syncedVisibleRange = await commands.dispatchCommand('chart.setVisibleRange', {
            from: '2026-06-01T09:31:00.000Z',
            to: '2026-06-01T09:36:00.000Z',
          });
          const expectedDateRange = {
            from: new Date(syncedVisibleRange.visibleRange.from * 1000).toISOString(),
            to: new Date(syncedVisibleRange.visibleRange.to * 1000).toISOString(),
          };
          await waitFor('layout date range synced', async () => {
            const layoutState = await commands.dispatchCommand('layout.getState');
            return layoutState.panes.length === 2
              && layoutState.panes.every((pane) => pane.dateRange?.from === expectedDateRange.from)
              && layoutState.panes.every((pane) => pane.dateRange?.to === expectedDateRange.to);
          });
          document.querySelector('[data-chart-host]')?.__v5OnCrosshairChange?.({
            active: true,
            time: '2026-06-01T09:32:00.000Z',
            price: 30123.5,
            point: { x: 120, y: 140 },
          });
          await waitFor('layout crosshair synced', async () => {
            const layoutState = await commands.dispatchCommand('layout.getState');
            return layoutState.panes.length === 2
              && layoutState.panes.every((pane) => pane.crosshair?.active === true)
              && layoutState.panes.every((pane) => pane.crosshair?.time === '2026-06-01T09:32:00.000Z')
              && layoutState.panes.every((pane) => pane.crosshair?.price === 30123.5);
          });
          const layoutStateAfterTimeDateSync = await commands.dispatchCommand('layout.getState');
          const chartHostCount = document.querySelectorAll('[data-chart-host]').length;
          const paneShell = document.querySelector('[data-layout-pane-shell]');
          const primaryPane = document.querySelector('[data-layout-pane][data-pane-id="primary"]');
          const paneCount = document.querySelectorAll('[data-layout-pane]').length;
          const placeholderPaneCount = document.querySelectorAll('[data-layout-pane][data-has-chart-host="false"]').length;
          const layoutModeBeforeVariantSwitch = chartRoute?.dataset.layoutMode || '';
          const layoutVariantBeforeVariantSwitch = chartRoute?.dataset.layoutVariant || '';
          const activePaneCountBeforeVariantSwitch = chartRoute?.dataset.activePaneCount || '';
          const paneShellModeBeforeVariantSwitch = paneShell?.dataset.layoutMode || '';
          const paneShellVariantBeforeVariantSwitch = paneShell?.dataset.layoutVariant || '';
          const twiceModePressedBeforeVariantSwitch = twiceModeButton?.getAttribute('aria-pressed') || '';
          const layoutButtonModeBeforeVariantSwitch = layoutButton?.dataset.layoutMode || '';
          const layoutButtonVariantBeforeVariantSwitch = layoutButton?.dataset.layoutVariant || '';
          const chartRect = rect('[data-chart-host]');
          const paneShellRect = rect('[data-layout-pane-shell]');
          const primaryPaneRect = rect('[data-layout-pane][data-pane-id="primary"]');
          const secondaryPaneRect = rect('[data-layout-pane][data-pane-id="secondary"]');
          const chartNavRect = rect('[data-chart-toolbar]');
          const footerRect = rect('[data-replay-footer]');
          const statusRect = rect('[data-replay-status]');
          layoutButton?.click();
          await waitFor('layout popover re-open for triple left', async () =>
            document.querySelector('[data-layout-popover]')?.hidden === false
          );
          tripleLeftModeButton?.click();
          await waitFor('triple left layout geometry', async () => (
            chartRoute?.dataset.layoutVariant === 'triple.left'
            && document.querySelector('[data-layout-pane-shell]')?.dataset.layoutVariant === 'triple.left'
            && document.querySelectorAll('[data-layout-pane]').length === 3
            && document.querySelectorAll('[data-chart-host]').length === 3
          ));
          const triplePrimaryRect = rect('[data-layout-pane][data-pane-id="primary"]');
          const tripleSecondaryRect = rect('[data-layout-pane][data-pane-id="secondary"]');
          const tripleTertiaryRect = rect('[data-layout-pane][data-pane-id="tertiary"]');
          const tripleHostCount = document.querySelectorAll('[data-chart-host]').length;
          await waitFor('triple panes have ohlc and price scales', async () => {
            const overlays = Array.from(document.querySelectorAll('[data-layout-pane] [data-chart-ohlc-overlay]'));
            const canvases = Array.from(document.querySelectorAll('[data-chart-canvas]'));
            return overlays.length === 3
              && overlays.every((overlay) => overlay.hidden === false)
              && overlays.every((overlay) => overlay.querySelector('[data-chart-ohlc-legend]')?.textContent?.includes('O'))
              && document.querySelectorAll('[data-layout-pane] [data-chart-toolbar]').length === 3
              && canvases.length === 3
              && canvases.every((canvas) => canvas.dataset.priceScaleVisible === 'true')
              && canvases.every((canvas) => canvas.dataset.timeScaleVisible === 'true');
          });
          const tripleOhlcOverlayCount = document.querySelectorAll('[data-layout-pane] [data-chart-ohlc-overlay]').length;
          const tripleVisibleOhlcOverlayCount = Array
            .from(document.querySelectorAll('[data-layout-pane] [data-chart-ohlc-overlay]'))
            .filter((overlay) => overlay.hidden === false).length;
          const tripleToolbarCount = document.querySelectorAll('[data-layout-pane] [data-chart-toolbar]').length;
          const triplePriceScaleCanvasCount = Array
            .from(document.querySelectorAll('[data-chart-canvas]'))
            .filter((canvas) => canvas.dataset.priceScaleVisible === 'true').length;
          const tripleTimeScaleCanvasCount = Array
            .from(document.querySelectorAll('[data-chart-canvas]'))
            .filter((canvas) => canvas.dataset.timeScaleVisible === 'true').length;
          const displayTimeframeSelectCount = document.querySelectorAll('[data-display-timeframe-select]').length;
          const tripleResizeMetrics = paneResizeMetrics();
          document.querySelector('[data-layout-close]')?.click();
          const routeNavigation = document.querySelector('[data-route-navigation]');
          const sessionsLink = routeNavigation?.querySelector('[data-route-link="setup"]');
          const toolbarSetupLinkCount = document
            .querySelector('[data-replay-workstation-toolbar]')
            ?.querySelectorAll('[data-route-link="setup"]').length || 0;
          sessionsLink?.click();
          await new Promise((resolve) => setTimeout(resolve, 100));
          const returnedToSetup = Boolean(document.querySelector('[data-route="setup"]'));
          return JSON.stringify({
            error: '',
            panelTitle,
            badgeText,
            activePaneId: chartRoute?.dataset.activePaneId || '',
            activePaneIdAfterSecondarySelect,
            activePaneCount: activePaneCountBeforeVariantSwitch,
            layoutMode: layoutModeBeforeVariantSwitch,
            layoutVariant: layoutVariantBeforeVariantSwitch,
            chartHostCount,
            paneCount,
            placeholderPaneCount,
            paneShellMode: paneShellModeBeforeVariantSwitch,
            paneShellVariant: paneShellVariantBeforeVariantSwitch,
            paneShellActivePaneId: paneShell?.dataset.activePaneId || '',
            paneShellActivePaneIdAfterSecondarySelect,
            primaryPaneActive: primaryPane?.dataset.activePane || '',
            primaryPaneActiveAfterSecondarySelect,
            secondaryPaneActive: secondaryPane?.dataset.activePane || '',
            secondaryPaneActiveAfterSecondarySelect,
            secondaryPaneHasChartHost: secondaryPane?.dataset.hasChartHost || '',
            defaultVerticalActivePaneId,
            defaultVerticalPaneShellActivePaneId,
            syncedNextPrimaryBefore,
            syncedNextPrimaryAfter,
            syncedNextSecondaryBefore,
            syncedNextSecondaryAfter,
            verticalPrimaryIndependentPaneDisplayTimeframes: verticalPrimaryIndependentLayoutState.panes.map((pane) => pane.displayTimeframe),
            verticalPrimaryIndependentPrimaryDisplayTimeframe,
            verticalPrimaryIndependentSecondaryDisplayTimeframe,
            verticalIndependentPaneDisplayTimeframes: verticalIndependentLayoutState.panes.map((pane) => pane.displayTimeframe),
            verticalReplayDisplayTimeframeAfterSecondaryChange: verticalIndependentDisplayContext.displayTimeframe,
            verticalPrimaryRenderedBarCount,
            verticalSecondaryRenderedBarCount,
            primaryPaneDisplayTimeframe: primaryPane?.dataset.displayTimeframe || '',
            secondaryPaneDisplayTimeframe: secondaryPane?.dataset.displayTimeframe || '',
            independentPaneDisplayTimeframes: layoutStateAfterIndependentTimeframe.panes.map((pane) => pane.displayTimeframe),
            replayDisplayTimeframeAfterIndependentPaneChange: replayDisplayContextAfterIndependentTimeframe.displayTimeframe,
            primarySelectValueAfterFocus,
            secondarySelectValueAfterFocus,
            layoutPaneDisplayTimeframes: layoutStateAfterTimeframe.panes.map((pane) => pane.displayTimeframe),
            layoutPaneTimes: layoutStateAfterTimeDateSync.panes.map((pane) => pane.time),
            layoutPaneDateRanges: layoutStateAfterTimeDateSync.panes.map((pane) => pane.dateRange),
            layoutPaneCrosshairs: layoutStateAfterTimeDateSync.panes.map((pane) => pane.crosshair),
            expectedDateRange,
            timeSyncChecked: Boolean(timeSyncInput?.checked),
            dateRangeSyncChecked: Boolean(dateRangeSyncInput?.checked),
            crosshairSyncChecked: Boolean(crosshairSyncInput?.checked),
            replayDisplayTimeframe: replayDisplayContextAfterTimeframe.displayTimeframe,
            displayTimeframeSelectValue: displayTimeframeSelect?.value || '',
            displayTimeframeSelectCount,
            layoutPopoverInitiallyVisible,
            layoutPopoverVisible: Boolean(layoutPopover && !layoutPopover.hidden),
            singleModeInitiallyPressed,
            layoutModeRowLabels: layoutModeRows.map((row) => row.querySelector('.chart-layout-mode-count')?.textContent || ''),
            layoutModeButtonCount: layoutModeButtons.length,
            layoutVariantButtonValues: layoutVariantButtons.map((button) => button.dataset.layoutVariantOption || ''),
            layoutModeIconCount,
            twiceModePressed: twiceModePressedBeforeVariantSwitch,
            tripleModeExists: Boolean(tripleModeButton),
            symbolSyncDisabled: Boolean(symbolSyncInput?.disabled),
            intervalSyncChecked: Boolean(intervalSyncInput?.checked),
            viewportPaneId: chartViewport?.dataset.chartPaneId || '',
            viewportActivePane: chartViewport?.dataset.activePane || '',
            viewportPaneRole: chartViewport?.dataset.paneRole || '',
            hostPaneId: chartHost?.dataset.chartPaneId || '',
            hostActivePane: chartHost?.dataset.activePane || '',
            layoutButtonDisabled: Boolean(layoutButton?.disabled),
            layoutButtonAriaDisabled: layoutButton?.getAttribute('aria-disabled') || '',
            layoutButtonExpanded: layoutButton?.getAttribute('aria-expanded') || '',
            layoutButtonState: layoutButton?.dataset.layoutState || '',
            layoutButtonMode: layoutButtonModeBeforeVariantSwitch,
            layoutButtonVariant: layoutButtonVariantBeforeVariantSwitch,
            hasShellText: bodyText.includes('Chart Replay Shell'),
            hasRouteText: bodyText.includes('Chart Route'),
            shellTopBarRect,
            shellTopBarDisplay,
            workspaceRect,
            hasSetupLink: Boolean(sessionsLink),
            sessionsLinkText: sessionsLink?.textContent?.trim() || '',
            hasRouteNavigation: Boolean(routeNavigation),
            toolbarSetupLinkCount,
            returnedToSetup,
            toolbarRect,
            headingRect,
            headingActionsRect,
            chartRect,
            paneShellRect,
            primaryPaneRect,
            secondaryPaneRect,
            triplePrimaryRect,
            tripleSecondaryRect,
            tripleTertiaryRect,
            tripleHostCount,
            tripleOhlcOverlayCount,
            tripleVisibleOhlcOverlayCount,
            tripleToolbarCount,
            triplePriceScaleCanvasCount,
            tripleTimeScaleCanvasCount,
            twiceHorizontalSplitHandles,
            twiceHorizontalMinWallRatios: twiceHorizontalMinWallLayoutState.split.ratios,
            twiceHorizontalMaxWallRatios: twiceHorizontalMaxWallLayoutState.split.ratios,
            twiceHorizontalMinWallPrimaryRect,
            twiceHorizontalMinWallSecondaryRect,
            twiceHorizontalMaxWallPrimaryRect,
            twiceHorizontalMaxWallSecondaryRect,
            twiceHorizontalResizeMetrics,
            tripleResizeMetrics,
            chartNavRect,
            footerRect,
            statusRect,
            timeframeControlVisible: timeframeControlRect.width > 0 && timeframeControlRect.height > 0,
            goToVisible: goToRect.width > 0 && goToRect.height > 0,
            settingsVisible: settingsRect.width > 0 && settingsRect.height > 0,
            footerVisible: footerRect.height > 0 && footerRect.top >= paneShellRect.bottom,
            statusVisible: statusRect.height > 0,
            chartNavBottomGap: chartRect.bottom - chartNavRect.bottom,
            headingToolbarGap: toolbarRect.top - headingRect.bottom,
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        } finally {
          window.fetch = originalFetch;
        }
      })()
    `));

    assert.equal(value.error, '', value.error || 'browser smoke failed');
    assert.equal(value.panelTitle, 'FX Session Replay');
    assert.equal(value.badgeText, 'Historical Review');
    assert.equal(value.activePaneIdAfterSecondarySelect, 'secondary');
    assert.equal(value.activePaneCount, '2');
    assert.equal(value.layoutMode, 'twice');
    assert.equal(value.layoutVariant, 'twice.horizontal');
    assert.equal(value.chartHostCount, 2);
    assert.equal(value.paneCount, 2);
    assert.equal(value.placeholderPaneCount, 0);
    assert.equal(value.paneShellMode, 'twice');
    assert.equal(value.paneShellVariant, 'twice.horizontal');
    assert.equal(value.paneShellActivePaneIdAfterSecondarySelect, 'secondary');
    assert.equal(value.primaryPaneActiveAfterSecondarySelect, 'false');
    assert.equal(value.secondaryPaneActiveAfterSecondarySelect, 'true');
    assert.equal(value.secondaryPaneHasChartHost, 'true');
    assert.equal(value.defaultVerticalActivePaneId, 'secondary');
    assert.equal(value.defaultVerticalPaneShellActivePaneId, 'secondary');
    assert.ok(
      value.syncedNextPrimaryAfter > value.syncedNextPrimaryBefore,
      'primary pane should advance on replay next'
    );
    assert.ok(
      value.syncedNextSecondaryAfter > value.syncedNextSecondaryBefore,
      'secondary pane should advance on replay next by default'
    );
    assert.deepEqual(value.verticalPrimaryIndependentPaneDisplayTimeframes, [5, 1]);
    assert.equal(value.verticalPrimaryIndependentPrimaryDisplayTimeframe, '5');
    assert.equal(value.verticalPrimaryIndependentSecondaryDisplayTimeframe, '1');
    assert.deepEqual(value.verticalIndependentPaneDisplayTimeframes, [1, 5]);
    assert.equal(value.verticalReplayDisplayTimeframeAfterSecondaryChange, 1);
    assert.deepEqual(value.independentPaneDisplayTimeframes, [1, 5]);
    assert.equal(value.replayDisplayTimeframeAfterIndependentPaneChange, 1);
    assert.equal(value.primarySelectValueAfterFocus, '1');
    assert.equal(value.secondarySelectValueAfterFocus, '5');
    assert.equal(value.primaryPaneDisplayTimeframe, '10');
    assert.equal(value.secondaryPaneDisplayTimeframe, '10');
    assert.deepEqual(value.layoutPaneDisplayTimeframes, [10, 10]);
    assert.equal(value.timeSyncChecked, true);
    assert.equal(value.dateRangeSyncChecked, true);
    assert.equal(value.crosshairSyncChecked, true);
    assert.equal(value.layoutPaneTimes.length, 2);
    assert.equal(new Set(value.layoutPaneTimes).size, 1);
    assert.ok(value.layoutPaneTimes[0], 'layout time should sync to both panes');
    assert.deepEqual(value.layoutPaneDateRanges, [
      value.expectedDateRange,
      value.expectedDateRange,
    ]);
    assert.deepEqual(value.layoutPaneCrosshairs, [
      {
        active: true,
        time: '2026-06-01T09:32:00.000Z',
        price: 30123.5,
        point: { x: 120, y: 140 },
      },
      {
        active: true,
        time: '2026-06-01T09:32:00.000Z',
        price: 30123.5,
        point: { x: 120, y: 140 },
      },
    ]);
    assert.equal(value.replayDisplayTimeframe, 10);
    assert.equal(value.displayTimeframeSelectValue, '10');
    assert.equal(value.displayTimeframeSelectCount, 1);
    assert.equal(value.layoutPopoverInitiallyVisible, true);
    assert.equal(value.layoutPopoverVisible, false);
    assert.equal(value.singleModeInitiallyPressed, 'true');
    assert.deepEqual(value.layoutModeRowLabels, ['1', '2', '3']);
    assert.equal(value.layoutModeButtonCount, 9);
    assert.deepEqual(value.layoutVariantButtonValues, [
      'single.default',
      'twice.vertical',
      'twice.horizontal',
      'triple.vertical',
      'triple.horizontal',
      'triple.left',
      'triple.right',
      'triple.top',
      'triple.bottom',
    ]);
    assert.equal(value.layoutModeIconCount, 9);
    assert.equal(value.twiceModePressed, 'true');
    assert.equal(value.tripleModeExists, true);
    assert.equal(value.symbolSyncDisabled, true);
    assert.equal(value.intervalSyncChecked, true);
    assert.equal(value.viewportPaneId, 'primary');
    assert.equal(value.viewportActivePane, 'false');
    assert.equal(value.viewportPaneRole, 'primary-chart');
    assert.equal(value.hostPaneId, 'primary');
    assert.equal(value.hostActivePane, 'false');
    assert.equal(value.layoutButtonDisabled, false);
    assert.equal(value.layoutButtonAriaDisabled, '');
    assert.equal(value.layoutButtonExpanded, 'false');
    assert.equal(value.layoutButtonState, 'ready');
    assert.equal(value.layoutButtonMode, 'twice');
    assert.equal(value.layoutButtonVariant, 'twice.horizontal');
    assert.equal(value.twiceHorizontalSplitHandles.length, 1);
    assert.equal(value.twiceHorizontalSplitHandles[0].id, 'primary-secondary-y');
    assert.equal(value.twiceHorizontalSplitHandles[0].orientation, 'horizontal');
    assert.equal(value.twiceHorizontalSplitHandles[0].hidden, false);
    assert.ok(value.twiceHorizontalSplitHandles[0].rect.width > 180);
    assert.ok(value.twiceHorizontalMinWallRatios.primary >= 0.29);
    assert.ok(value.twiceHorizontalMinWallRatios.secondary <= 1.71);
    assert.ok(value.twiceHorizontalMaxWallRatios.primary <= 1.71);
    assert.ok(value.twiceHorizontalMaxWallRatios.secondary >= 0.29);
    assert.ok(
      value.twiceHorizontalMinWallPrimaryRect.height > value.paneShellRect.height * 0.12,
      'upward split drag should keep primary pane above the minimum wall'
    );
    assert.ok(
      value.twiceHorizontalMinWallSecondaryRect.height > value.paneShellRect.height * 0.75,
      'upward split drag should preserve secondary pane space'
    );
    assert.ok(
      value.twiceHorizontalMaxWallPrimaryRect.height > value.paneShellRect.height * 0.75,
      'downward split drag should preserve primary pane space'
    );
    assert.ok(
      value.twiceHorizontalMaxWallSecondaryRect.height > value.paneShellRect.height * 0.12,
      'downward split drag should keep secondary pane above the minimum wall'
    );
    assert.ok(
      Math.abs(value.primaryPaneRect.left - value.secondaryPaneRect.left) <= 2,
      'twice.horizontal panes should share the same left edge'
    );
    assert.ok(
      value.secondaryPaneRect.top > value.primaryPaneRect.top,
      'twice.horizontal secondary pane should be below primary pane'
    );
    assert.equal(value.twiceHorizontalResizeMetrics.length, 2);
    value.twiceHorizontalResizeMetrics.forEach((metric) => {
      assert.ok(metric.host.width > 180, `pane ${metric.paneId} host width should be non-zero`);
      assert.ok(metric.host.height > 180, `pane ${metric.paneId} host height should be non-zero`);
      assert.ok(
        metric.canvas.height <= metric.host.height + 2,
        `pane ${metric.paneId} canvas should not exceed host height`
      );
      assert.ok(
        metric.surface.height <= metric.host.height + 2,
        `pane ${metric.paneId} engine surface should not exceed host height`
      );
      assert.ok(Math.abs(metric.canvasResizeHeight - metric.canvas.height) <= 2);
      assert.ok(Math.abs(metric.surfaceResizeHeight - metric.canvas.height) <= 2);
    });
    assert.equal(value.tripleHostCount, 3);
    assert.equal(value.tripleOhlcOverlayCount, 3);
    assert.equal(value.tripleVisibleOhlcOverlayCount, 3);
    assert.equal(value.tripleToolbarCount, 3);
    assert.equal(value.triplePriceScaleCanvasCount, 3);
    assert.equal(value.tripleTimeScaleCanvasCount, 3);
    assert.equal(value.tripleResizeMetrics.length, 3);
    value.tripleResizeMetrics.forEach((metric) => {
      assert.ok(metric.host.width > 180, `pane ${metric.paneId} host width should be non-zero`);
      assert.ok(metric.host.height > 180, `pane ${metric.paneId} host height should be non-zero`);
      assert.ok(metric.canvas.width > 180, `pane ${metric.paneId} canvas width should be non-zero`);
      assert.ok(metric.canvas.height > 180, `pane ${metric.paneId} canvas height should be non-zero`);
      assert.ok(metric.surface.width > 180, `pane ${metric.paneId} engine surface width should be non-zero`);
      assert.ok(metric.surface.height > 180, `pane ${metric.paneId} engine surface height should be non-zero`);
      assert.ok(Math.abs(metric.resizeWidth - metric.canvas.width) <= 2);
      assert.ok(Math.abs(metric.resizeHeight - metric.canvas.height) <= 2);
      assert.ok(Math.abs(metric.canvasResizeWidth - metric.canvas.width) <= 2);
      assert.ok(Math.abs(metric.canvasResizeHeight - metric.canvas.height) <= 2);
      assert.ok(Math.abs(metric.surfaceResizeWidth - metric.canvas.width) <= 2);
      assert.ok(Math.abs(metric.surfaceResizeHeight - metric.canvas.height) <= 2);
      assert.ok(
        Math.abs(metric.surface.width - metric.canvas.width) <= 2,
        `pane ${metric.paneId} engine surface should not overflow canvas width`
      );
    });
    assert.ok(
      value.triplePrimaryRect.width > value.tripleSecondaryRect.width,
      'triple.left primary pane should be wider than secondary pane'
    );
    assert.ok(
      value.tripleTertiaryRect.top > value.tripleSecondaryRect.top,
      'triple.left tertiary pane should be below secondary pane'
    );
    assert.equal(value.hasShellText, false);
    assert.equal(value.hasRouteText, false);
    assert.equal(value.shellTopBarDisplay, 'none');
    assert.equal(value.shellTopBarRect.height, 0);
    assert.ok(value.workspaceRect.top <= 10, `workspace starts too low: ${value.workspaceRect.top}`);
    assert.equal(value.hasSetupLink, true);
    assert.equal(value.hasRouteNavigation, true);
    assert.equal(value.sessionsLinkText, 'Sessions');
    assert.equal(value.toolbarSetupLinkCount, 0);
    assert.equal(value.returnedToSetup, true);
    assert.equal(value.timeframeControlVisible, true);
    assert.equal(value.goToVisible, true);
    assert.equal(value.settingsVisible, true);
    assert.ok(value.headingRect.height <= 34, `route heading too tall: ${value.headingRect.height}`);
    assert.ok(value.headingActionsRect.height <= 28, `route actions too tall: ${value.headingActionsRect.height}`);
    assert.ok(value.headingToolbarGap <= 10, `heading-to-toolbar gap too large: ${value.headingToolbarGap}`);
    assert.ok(value.toolbarRect.height <= 46, `toolbar too tall: ${value.toolbarRect.height}`);
    assert.ok(value.paneShellRect.height >= 640, `pane shell too short: ${value.paneShellRect.height}`);
    assert.ok(value.chartRect.height >= 300, `split chart host too short: ${value.chartRect.height}`);
    assert.equal(value.footerVisible, true);
    assert.equal(value.statusVisible, true);
    assert.ok(value.chartNavBottomGap >= 20, `chart toolbar too close to bottom: ${value.chartNavBottomGap}`);
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
  () => console.log('v5 replay workstation layout browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
