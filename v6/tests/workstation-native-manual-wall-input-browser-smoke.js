import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 760, width: 1200 });
try {
  const setup = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const deadline = performance.now() + 5000;
      let applyState = await commands.dispatchCommand('chartEntryProjectionApply.getState');
      while (applyState.status === 'idle' && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        applyState = await commands.dispatchCommand('chartEntryProjectionApply.getState');
      }
      await new Promise((resolve) => requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      }));
      const root = document.querySelector('[data-v6-root]');
      const host = document.querySelector('[data-v6-chart-engine-host]');
      const rect = host.getBoundingClientRect();
      const beforeViewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, {
        paneId: 'main',
      });
      return {
        beforeIntent: beforeViewport.intent,
        beforeProjection: beforeViewport.projection,
        bridgeMounted: Boolean(root.__v6ManualWallInputBridge?.destroy),
        hostRect: {
          height: rect.height,
          left: rect.left,
          top: rect.top,
          width: rect.width,
        },
      };
    })()))()
  `));

  assert.equal(setup.bridgeMounted, true);
  assert.equal(setup.beforeIntent.origin, 'default');
  assert.equal(setup.hostRect.width > 0, true);
  assert.equal(setup.hostRect.height > 0, true);

  const startX = setup.hostRect.left + (setup.hostRect.width * 0.58);
  const startY = setup.hostRect.top + (setup.hostRect.height * 0.52);
  await page.client.send('Input.dispatchMouseEvent', {
    deltaX: 0,
    deltaY: -520,
    type: 'mouseWheel',
    x: startX,
    y: startY,
  });
  await page.client.send('Input.dispatchMouseEvent', {
    deltaX: 180,
    deltaY: 0,
    type: 'mouseWheel',
    x: startX,
    y: startY,
  });

  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const waitForManual = async () => {
        for (let attempt = 0; attempt < 30; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 20));
          const viewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, {
            paneId: 'main',
          });
          if (viewport.intent.origin === 'manual') {
            return viewport;
          }
        }
        return commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, {
          paneId: 'main',
        });
      };

      const manualViewport = await waitForManual();
      const manualSurface = document.querySelector('[data-v6-root]').__v6WorkstationChartSurface.getState();

      return {
        manual: {
          appliedViewport: manualSurface.appliedViewport[0],
          intent: manualViewport.intent,
          projection: manualViewport.projection,
          visibleLogicalRange: manualSurface.panes[0].snapshot.visibleLogicalRange,
        },
      };
    })()))()
  `));

  assert.equal(value.manual.intent.origin, 'manual');
  assert.equal(value.manual.intent.revision, 1);
  assert.equal(Number.isFinite(value.manual.intent.latestOffsetBars), true);
  assert.equal(Number.isFinite(value.manual.intent.spanBars), true);
  assert.equal(value.manual.intent.spanBars > 0, true);
  assert.equal(value.manual.projection, null);
  assert.deepEqual(value.manual.appliedViewport.origin, 'default');
  assert.notDeepEqual(value.manual.visibleLogicalRange, {
    from: setup.beforeProjection.from,
    to: setup.beforeProjection.to,
  });
} finally {
  await page.cleanup();
}

console.log('v6 workstation native manual wall input browser smoke passed');
