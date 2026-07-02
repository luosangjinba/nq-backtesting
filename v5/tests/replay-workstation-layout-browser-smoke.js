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
            bottom: Math.round(box?.bottom || 0),
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
          const twiceModeButton = document.querySelector('[data-layout-mode-option="twice"]');
          const tripleModeButton = document.querySelector('[data-layout-mode-option="triple"]');
          const symbolSyncInput = document.querySelector('[data-layout-sync="symbol"]');
          const intervalSyncInput = document.querySelector('[data-layout-sync="interval"]');
          const timeSyncInput = document.querySelector('[data-layout-sync="time"]');
          const dateRangeSyncInput = document.querySelector('[data-layout-sync="dateRange"]');
          const layoutPopoverInitiallyVisible = Boolean(layoutPopover && !layoutPopover.hidden);
          const singleModeInitiallyPressed = singleModeButton?.getAttribute('aria-pressed') || '';
          twiceModeButton?.click();
          await waitFor('twice layout mode', async () => (
            chartRoute?.dataset.layoutMode === 'twice'
            && document.querySelectorAll('[data-layout-pane]').length === 2
          ));
          intervalSyncInput?.click();
          await waitFor('interval sync enabled', async () => intervalSyncInput?.checked === true);
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
          await waitFor('synced secondary display timeframe', async () => {
            const layoutState = await commands.dispatchCommand('layout.getState');
            const displayContext = await commands.dispatchCommand('replay.getDisplayContext');
            return layoutState.panes.length === 2
              && layoutState.panes.every((pane) => pane.displayTimeframe === 5)
              && displayContext.displayTimeframe === 5
              && document.querySelector('[data-display-timeframe-select]')?.value === '5';
          });
          const layoutStateAfterTimeframe = await commands.dispatchCommand('layout.getState');
          const replayDisplayContextAfterTimeframe = await commands.dispatchCommand('replay.getDisplayContext');
          timeSyncInput?.click();
          dateRangeSyncInput?.click();
          await waitFor('time and date range sync enabled', async () => {
            const layoutState = await commands.dispatchCommand('layout.getState');
            return layoutState.sync.time === true && layoutState.sync.dateRange === true;
          });
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
          const layoutStateAfterTimeDateSync = await commands.dispatchCommand('layout.getState');
          const chartHostCount = document.querySelectorAll('[data-chart-host]').length;
          const paneShell = document.querySelector('[data-layout-pane-shell]');
          const primaryPane = document.querySelector('[data-layout-pane][data-pane-id="primary"]');
          const paneCount = document.querySelectorAll('[data-layout-pane]').length;
          const placeholderPaneCount = document.querySelectorAll('[data-layout-pane][data-has-chart-host="false"]').length;
          const chartRect = rect('[data-chart-host]');
          const paneShellRect = rect('[data-layout-pane-shell]');
          const chartNavRect = rect('[data-chart-toolbar]');
          const footerRect = rect('[data-replay-footer]');
          const statusRect = rect('[data-replay-status]');
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
            activePaneCount: chartRoute?.dataset.activePaneCount || '',
            layoutMode: chartRoute?.dataset.layoutMode || '',
            chartHostCount,
            paneCount,
            placeholderPaneCount,
            paneShellMode: paneShell?.dataset.layoutMode || '',
            paneShellActivePaneId: paneShell?.dataset.activePaneId || '',
            paneShellActivePaneIdAfterSecondarySelect,
            primaryPaneActive: primaryPane?.dataset.activePane || '',
            primaryPaneActiveAfterSecondarySelect,
            secondaryPaneActive: secondaryPane?.dataset.activePane || '',
            secondaryPaneActiveAfterSecondarySelect,
            secondaryPaneHasChartHost: secondaryPane?.dataset.hasChartHost || '',
            primaryPaneDisplayTimeframe: primaryPane?.dataset.displayTimeframe || '',
            secondaryPaneDisplayTimeframe: secondaryPane?.dataset.displayTimeframe || '',
            layoutPaneDisplayTimeframes: layoutStateAfterTimeframe.panes.map((pane) => pane.displayTimeframe),
            layoutPaneTimes: layoutStateAfterTimeDateSync.panes.map((pane) => pane.time),
            layoutPaneDateRanges: layoutStateAfterTimeDateSync.panes.map((pane) => pane.dateRange),
            expectedDateRange,
            timeSyncChecked: Boolean(timeSyncInput?.checked),
            dateRangeSyncChecked: Boolean(dateRangeSyncInput?.checked),
            replayDisplayTimeframe: replayDisplayContextAfterTimeframe.displayTimeframe,
            displayTimeframeSelectValue: displayTimeframeSelect?.value || '',
            layoutPopoverInitiallyVisible,
            layoutPopoverVisible: Boolean(layoutPopover && !layoutPopover.hidden),
            singleModeInitiallyPressed,
            twiceModePressed: twiceModeButton?.getAttribute('aria-pressed') || '',
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
            layoutButtonMode: layoutButton?.dataset.layoutMode || '',
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
    assert.equal(value.chartHostCount, 1);
    assert.equal(value.paneCount, 2);
    assert.equal(value.placeholderPaneCount, 1);
    assert.equal(value.paneShellMode, 'twice');
    assert.equal(value.paneShellActivePaneIdAfterSecondarySelect, 'secondary');
    assert.equal(value.primaryPaneActiveAfterSecondarySelect, 'false');
    assert.equal(value.secondaryPaneActiveAfterSecondarySelect, 'true');
    assert.equal(value.secondaryPaneHasChartHost, 'false');
    assert.equal(value.primaryPaneDisplayTimeframe, '5');
    assert.equal(value.secondaryPaneDisplayTimeframe, '5');
    assert.deepEqual(value.layoutPaneDisplayTimeframes, [5, 5]);
    assert.equal(value.timeSyncChecked, true);
    assert.equal(value.dateRangeSyncChecked, true);
    assert.equal(value.layoutPaneTimes.length, 2);
    assert.equal(new Set(value.layoutPaneTimes).size, 1);
    assert.ok(value.layoutPaneTimes[0], 'layout time should sync to both panes');
    assert.deepEqual(value.layoutPaneDateRanges, [
      value.expectedDateRange,
      value.expectedDateRange,
    ]);
    assert.equal(value.replayDisplayTimeframe, 5);
    assert.equal(value.displayTimeframeSelectValue, '5');
    assert.equal(value.layoutPopoverInitiallyVisible, true);
    assert.equal(value.layoutPopoverVisible, false);
    assert.equal(value.singleModeInitiallyPressed, 'true');
    assert.equal(value.twiceModePressed, 'true');
    assert.equal(value.tripleModeExists, true);
    assert.equal(value.symbolSyncDisabled, true);
    assert.equal(value.intervalSyncChecked, true);
    assert.equal(value.viewportPaneId, 'primary');
    assert.equal(value.viewportActivePane, 'true');
    assert.equal(value.viewportPaneRole, 'primary-chart');
    assert.equal(value.hostPaneId, 'primary');
    assert.equal(value.hostActivePane, 'true');
    assert.equal(value.layoutButtonDisabled, false);
    assert.equal(value.layoutButtonAriaDisabled, '');
    assert.equal(value.layoutButtonExpanded, 'false');
    assert.equal(value.layoutButtonState, 'ready');
    assert.equal(value.layoutButtonMode, 'twice');
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
