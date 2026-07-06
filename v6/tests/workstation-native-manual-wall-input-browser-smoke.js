import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 760, width: 1200 });
try {
  const setup = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');

      const bars = Array.from({ length: 12 }, (_, index) => ({
        close: 100 + index + 0.5,
        high: 101 + index,
        low: 99 + index,
        open: 100 + index,
        timestamp: 1780306200 + (index * 60),
      }));
      const session = {
        endTime: '2026-06-01T09:41:00.000Z',
        id: 'workstation-native-manual-wall-input-session',
        startTime: '2026-06-01T09:30:00.000Z',
        symbol: 'NQ',
        timeframe: '1m',
      };

      await commands.dispatchCommand(contracts.DEFAULT_WALL_COMMANDS.LOAD, {
        bars,
        latestOffsetBars: 8,
        paneId: 'default',
        prefixBars: 0,
        session,
        spanBars: 120,
      });
      for (let index = 0; index < 3; index += 1) {
        await commands.dispatchCommand(contracts.DEFAULT_WALL_COMMANDS.NEXT);
      }
      await new Promise((resolve) => requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      }));
      const root = document.querySelector('[data-v6-root]');
      const host = document.querySelector('[data-v6-chart-engine-host]');
      const rect = host.getBoundingClientRect();
      const beforeViewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, {
        paneId: 'default',
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
            paneId: 'default',
          });
          if (viewport.intent.origin === 'manual') {
            return viewport;
          }
        }
        return commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, {
          paneId: 'default',
        });
      };

      const manualViewport = await waitForManual();
      const manualSurface = document.querySelector('[data-v6-root]').__v6WorkstationChartSurface.getState();
      const next = await commands.dispatchCommand(contracts.DEFAULT_WALL_COMMANDS.NEXT);
      await new Promise((resolve) => requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      }));
      const nextViewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, {
        paneId: 'default',
      });
      const nextSurface = document.querySelector('[data-v6-root]').__v6WorkstationChartSurface.getState();

      return {
        manual: {
          appliedViewport: manualSurface.appliedViewport[0],
          intent: manualViewport.intent,
          projection: manualViewport.projection,
          visibleLogicalRange: manualSurface.panes[0].snapshot.visibleLogicalRange,
        },
        next: {
          activeProjection: next.activeProjection,
          appliedViewport: nextSurface.appliedViewport[0],
          intent: nextViewport.intent,
          projection: nextViewport.projection,
          replayCursorIndex: next.replayState.cursorIndex,
          visibleLogicalRange: nextSurface.panes[0].snapshot.visibleLogicalRange,
        },
      };
    })()))()
  `));

  assert.equal(value.manual.intent.origin, 'manual');
  assert.equal(value.manual.intent.revision, 1);
  assert.equal(Number.isFinite(value.manual.intent.latestOffsetBars), true);
  assert.equal(Number.isFinite(value.manual.intent.spanBars), true);
  assert.equal(value.manual.intent.spanBars > 0, true);
  assert.notDeepEqual(value.manual.projection, setup.beforeProjection);
  assert.deepEqual(value.manual.appliedViewport.origin, 'manual');
  assert.equal(value.next.replayCursorIndex, 4);
  assert.equal(value.next.intent.origin, 'manual');
  assert.equal(value.next.intent.revision, 1);
  assert.equal(Math.abs(value.next.intent.latestOffsetBars - value.manual.intent.latestOffsetBars) < 0.000001, true);
  assert.equal(Math.abs(value.next.intent.spanBars - value.manual.intent.spanBars) < 0.000001, true);
  assert.deepEqual(value.next.projection, value.next.activeProjection);
  assert.equal(Math.abs((value.next.projection.to - value.manual.projection.to) - 1) < 0.000001, true);
  assert.equal(Math.abs((value.next.projection.from - value.manual.projection.from) - 1) < 0.000001, true);
} finally {
  await page.cleanup();
}

console.log('v6 workstation native manual wall input browser smoke passed');
