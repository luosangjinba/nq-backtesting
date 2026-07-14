import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 900, width: 1440 });

try {
  const baseline = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const rectOf = (element) => {
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
          bottom: Math.round(rect.bottom),
          height: Math.round(rect.height),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
        };
      };
      const visiblePaneHosts = () => [...document.querySelectorAll('[data-v6-chart-engine-host]')]
        .filter((host) => !host.hidden && host.getAttribute('aria-hidden') !== 'true');
      const readControl = (selector) => {
        const element = document.querySelector(selector);
        return {
          disabled: element?.disabled ?? null,
          exists: Boolean(element),
          rect: rectOf(element),
        };
      };

      const root = document.querySelector('[data-v6-root]');
      localStorage.removeItem('v6.sessions.metadata');
      document.querySelector('[data-v6-session-setup-name]').value = 'Workspace cleanup baseline';
      document.querySelector('[data-v6-session-setup-start]').value = '2026-06-01T09:30';
      document.querySelector('[data-v6-session-setup-end]').value = '2026-06-01T10:30';
      document.querySelector('[data-v6-dashboard-create-session]').click();
      const workstationDeadline = performance.now() + 5000;
      while (root.dataset.v6Surface !== 'workstation' && performance.now() < workstationDeadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      const chartSurface = document.querySelector('[data-v6-chart-surface]');
      const mainHost = document.querySelector('[data-v6-chart-engine-host][data-v6-pane-id="main"]');
      const workstationMain = document.querySelector('[data-v6-workstation-main]');
      const single = {
        chart: rectOf(chartSurface),
        main: rectOf(workstationMain),
        mainHost: rectOf(mainHost),
        visiblePaneCount: visiblePaneHosts().length,
      };

      const panelFlow = {};
      const openAndClosePanel = async ({ close, panel, toggle }) => {
        const toggleElement = document.querySelector(toggle);
        const panelElement = document.querySelector(panel);
        toggleElement.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        const opened = !panelElement.hidden;
        document.querySelector(close).click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        return { closed: panelElement.hidden, opened };
      };
      panelFlow.journal = await openAndClosePanel({
        close: '[data-v6-journal-close]',
        panel: '[data-v6-journal-panel]',
        toggle: '[data-v6-journal-toggle]',
      });
      panelFlow.replay = await openAndClosePanel({
        close: '[data-v6-replay-workflow-close]',
        panel: '[data-v6-replay-workflow-panel]',
        toggle: '[data-v6-replay-workflow-toggle]',
      });
      panelFlow.settings = await openAndClosePanel({
        close: '[data-v6-settings-close]',
        panel: '[data-v6-settings-panel]',
        toggle: '[data-v6-settings-toggle]',
      });

      const timeframeToggle = document.querySelector('[data-v6-display-timeframe-toggle]');
      const timeframeMenu = document.querySelector('[data-v6-display-timeframe-menu]');
      timeframeToggle.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const timeframeOpened = !timeframeMenu.hidden;
      timeframeToggle.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const timeframeClosed = timeframeMenu.hidden;

      const goToDetails = document.querySelector('[data-v6-rail-goto-details]');
      document.querySelector('[data-v6-rail-goto]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const goToOpened = goToDetails.open;
      document.querySelector('[data-v6-rail-goto]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const goToClosed = !goToDetails.open;

      document.querySelector('[data-v6-top-page-layout]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      document.querySelector('[data-v6-layout-mode="twice"][data-v6-layout-variant="twice-vertical"]').click();
      await new Promise((resolve) => setTimeout(resolve, 50));
      const twiceHosts = visiblePaneHosts();
      const twice = {
        chart: rectOf(chartSurface),
        hostRects: twiceHosts.map(rectOf),
        paneIds: twiceHosts.map((host) => host.dataset.v6PaneId),
        resetCount: twiceHosts.reduce((count, host) => count + host.querySelectorAll('[data-v6-reset-view]').length, 0),
        maximizeCount: twiceHosts.reduce((count, host) => count + host.querySelectorAll('[data-v6-chart-maximize-restore]').length, 0),
        visiblePaneCount: twiceHosts.length,
      };

      const sync = document.querySelector('[data-v6-layout-sync="crosshair"]');
      document.querySelector('[data-v6-top-page-layout]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const syncBefore = sync.checked;
      sync.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const syncAfter = sync.checked;
      sync.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const syncRestored = sync.checked;

      const secondaryMaximize = document.querySelector('[data-v6-chart-maximize-pane-id="secondary"]');
      secondaryMaximize.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const maximizedVisiblePaneCount = visiblePaneHosts().length;
      secondaryMaximize.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const restoredVisiblePaneCount = visiblePaneHosts().length;

      const mainReset = document.querySelector('[data-v6-reset-pane-id="main"]');
      mainReset.click();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const pointerTarget = mainHost.querySelector('canvas') || mainHost;
      let pointerObserved = false;
      pointerTarget.addEventListener('pointerdown', () => { pointerObserved = true; }, { once: true });
      pointerTarget.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        clientX: Math.round(rectOf(mainHost).left + 20),
        clientY: Math.round(rectOf(mainHost).top + 40),
        pointerId: 1,
        pointerType: 'mouse',
      }));

      return {
        activeControls: {
          goTo: readControl('[data-v6-rail-goto]'),
          journal: readControl('[data-v6-journal-toggle]'),
          layout: readControl('[data-v6-top-page-layout]'),
          maximize: readControl('[data-v6-chart-maximize-pane-id="main"]'),
          replay: readControl('[data-v6-replay-workflow-toggle]'),
          reset: readControl('[data-v6-reset-pane-id="main"]'),
          settings: readControl('[data-v6-settings-toggle]'),
          timeframe: readControl('[data-v6-display-timeframe-toggle]'),
          transportNext: readControl('[data-v6-transport-action="next"]'),
          transportPlay: readControl('[data-v6-transport-action="play-toggle"]'),
        },
        chartCanvasCount: mainHost.querySelectorAll('canvas').length,
        chartPointerEvents: getComputedStyle(mainHost).pointerEvents,
        goToClosed,
        goToOpened,
        maximizedVisiblePaneCount,
        panelFlow,
        pointerObserved,
        resetStillMounted: Boolean(document.querySelector('[data-v6-reset-pane-id="main"]')),
        restoredVisiblePaneCount,
        rootBooted: root.dataset.booted,
        single,
        stateDisabledControls: {
          previous: readControl('[data-v6-transport-step-back]'),
          restart: readControl('[data-v6-transport-restart]'),
        },
        syncAfter,
        syncBefore,
        syncRestored,
        timeframeClosed,
        timeframeOpened,
        transport: rectOf(document.querySelector('[data-v6-transport]')),
        twice,
        viewport: { height: innerHeight, width: innerWidth },
      };
    })()))()
  `));

  assert.equal(baseline.rootBooted, 'true');
  assert.deepEqual(baseline.panelFlow, {
    journal: { closed: true, opened: true },
    replay: { closed: true, opened: true },
    settings: { closed: true, opened: true },
  });
  assert.equal(baseline.timeframeOpened, true);
  assert.equal(baseline.timeframeClosed, true);
  assert.equal(baseline.goToOpened, true);
  assert.equal(baseline.goToClosed, true);

  const controlsRequiringBox = new Set([
    'journal',
    'maximize',
    'replay',
    'reset',
    'settings',
    'timeframe',
    'transportNext',
    'transportPlay',
  ]);
  for (const [name, control] of Object.entries(baseline.activeControls)) {
    assert.equal(control.exists, true, `${name} must survive workspace cleanup`);
    assert.notEqual(control.disabled, true, `${name} must remain actionable`);
    if (controlsRequiringBox.has(name)) {
      assert.equal(control.rect.width > 0 && control.rect.height > 0, true, `${name} must remain visible`);
    }
  }
  assert.equal(baseline.stateDisabledControls.previous.exists, true);
  assert.equal(baseline.stateDisabledControls.previous.disabled, true);
  assert.equal(baseline.stateDisabledControls.restart.exists, true);
  assert.equal(baseline.stateDisabledControls.restart.disabled, true);

  assert.equal(baseline.single.visiblePaneCount, 1);
  assert.equal(baseline.single.chart.width > baseline.viewport.width * 0.8, true);
  assert.equal(baseline.single.chart.height > baseline.viewport.height * 0.6, true);
  assert.deepEqual(baseline.single.mainHost, baseline.single.chart);
  assert.equal(baseline.single.main.width >= baseline.single.chart.width, true);

  assert.equal(baseline.twice.visiblePaneCount, 2);
  assert.deepEqual(baseline.twice.paneIds, ['main', 'secondary']);
  assert.equal(baseline.twice.resetCount, 2);
  assert.equal(baseline.twice.maximizeCount, 2);
  assert.equal(baseline.twice.hostRects.every((rect) => rect.width > 0 && rect.height > 0), true);
  assert.equal(Math.abs(baseline.twice.chart.width - baseline.single.chart.width) <= 2, true);
  assert.equal(Math.abs(baseline.twice.chart.height - baseline.single.chart.height) <= 2, true);
  assert.equal(baseline.maximizedVisiblePaneCount, 1);
  assert.equal(baseline.restoredVisiblePaneCount, 2);

  assert.equal(baseline.syncBefore, false);
  assert.equal(baseline.syncAfter, true);
  assert.equal(baseline.syncRestored, false);
  assert.equal(baseline.resetStillMounted, true);
  assert.equal(baseline.pointerObserved, true);
  assert.notEqual(baseline.chartPointerEvents, 'none');
  assert.equal(baseline.chartCanvasCount > 0, true);
  assert.equal(baseline.transport.width > 0 && baseline.transport.height > 0, true);
} finally {
  await page.cleanup();
}

console.log('v6 workspace cleanup functional baseline Step 419 browser smoke passed');
