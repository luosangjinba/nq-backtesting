import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

function rangesNear(left = {}, right = {}, epsilon = 1) {
  return (
    Math.abs(Number(left.from) - Number(right.from)) <= epsilon &&
    Math.abs(Number(left.to) - Number(right.to)) <= epsilon
  );
}

const page = await openV6Page({ height: 820, width: 1360 });

async function readViewportState() {
  return JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');
      const viewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, {
        paneId: 'main',
      });
      const surface = root.__v6WorkstationChartSurface.getState();
      return {
        intent: viewport.intent,
        projection: viewport.projection,
        visibleRange: surface.panes[0]?.snapshot?.visibleLogicalRange || null,
      };
    })()))()
  `));
}

try {
  const setup = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const deadline = performance.now() + 5000;
      let applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
      while (applyState.status === 'idle' && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 40));
        applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const host = document.querySelector('[data-v6-chart-engine-host]');
      const rect = host.getBoundingClientRect();
      return {
        applyState,
        hostRect: {
          height: rect.height,
          left: rect.left,
          top: rect.top,
          width: rect.width,
        },
      };
    })()))()
  `));

  assert.equal(setup.applyState.status, 'applied');
  const startX = setup.hostRect.left + (setup.hostRect.width * 0.48);
  const startY = setup.hostRect.top + (setup.hostRect.height * 0.48);
  const endX = startX + 220;

  await page.client.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: startX,
    y: startY,
  });
  await page.client.send('Input.dispatchMouseEvent', {
    button: 'left',
    buttons: 1,
    clickCount: 1,
    type: 'mousePressed',
    x: startX,
    y: startY,
  });
  for (const x of [startX + 60, startX + 120, startX + 180, endX]) {
    await page.client.send('Input.dispatchMouseEvent', {
      button: 'left',
      buttons: 1,
      type: 'mouseMoved',
      x,
      y: startY,
    });
  }
  await page.client.send('Input.dispatchMouseEvent', {
    button: 'left',
    buttons: 0,
    clickCount: 1,
    type: 'mouseReleased',
    x: endX,
    y: startY,
  });

  await new Promise((resolve) => setTimeout(resolve, 180));
  const released = await readViewportState();

  for (const point of [
    { x: endX + 120, y: startY + 40 },
    { x: endX - 180, y: startY - 30 },
    { x: endX + 80, y: startY + 80 },
  ]) {
    await page.client.send('Input.dispatchMouseEvent', {
      buttons: 0,
      type: 'mouseMoved',
      x: point.x,
      y: point.y,
    });
  }
  await new Promise((resolve) => setTimeout(resolve, 180));
  const afterHover = await readViewportState();

  assert.equal(afterHover.intent.origin, released.intent.origin);
  assert.deepEqual(afterHover.intent, released.intent);
  assert.deepEqual(afterHover.projection, released.projection);
  assert.equal(rangesNear(afterHover.visibleRange, released.visibleRange), true);
} finally {
  await page.cleanup();
}

console.log('v6 chart drag release lifecycle browser smoke passed');
