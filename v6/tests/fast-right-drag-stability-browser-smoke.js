import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

function rangesNear(left = {}, right = {}, epsilon = 2) {
  return (
    Math.abs(Number(left.from) - Number(right.from)) <= epsilon &&
    Math.abs(Number(left.to) - Number(right.to)) <= epsilon
  );
}

const page = await openV6Page({ height: 820, width: 1360 });

async function readState() {
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
        appliedViewport: surface.appliedViewport[0] || null,
        intent: viewport.intent,
        projection: viewport.projection,
        visibleRange: surface.panes[0]?.snapshot?.visibleLogicalRange || null,
      };
    })()))()
  `));
}

async function dragRight({ fromX, toX, y }) {
  await page.client.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: fromX,
    y,
  });
  await page.client.send('Input.dispatchMouseEvent', {
    button: 'left',
    buttons: 1,
    clickCount: 1,
    type: 'mousePressed',
    x: fromX,
    y,
  });
  for (const x of [fromX + 90, fromX + 180, fromX + 270, toX]) {
    await page.client.send('Input.dispatchMouseEvent', {
      button: 'left',
      buttons: 1,
      type: 'mouseMoved',
      x,
      y,
    });
  }
  await page.client.send('Input.dispatchMouseEvent', {
    button: 'left',
    buttons: 0,
    clickCount: 1,
    type: 'mouseReleased',
    x: toX,
    y,
  });
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
        initial: await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, {
          paneId: 'main',
        }),
      };
    })()))()
  `));

  assert.equal(setup.applyState.status, 'applied');
  const y = setup.hostRect.top + (setup.hostRect.height * 0.5);
  const fromX = setup.hostRect.left + (setup.hostRect.width * 0.42);
  const toX = setup.hostRect.left + (setup.hostRect.width * 0.72);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await dragRight({ fromX, toX, y });
    await new Promise((resolve) => setTimeout(resolve, 70));
  }
  await new Promise((resolve) => setTimeout(resolve, 220));
  const afterDrag = await readState();

  for (const point of [
    { x: toX - 180, y: y - 45 },
    { x: toX + 60, y: y + 35 },
    { x: fromX + 20, y: y + 60 },
  ]) {
    await page.client.send('Input.dispatchMouseEvent', {
      buttons: 0,
      type: 'mouseMoved',
      x: point.x,
      y: point.y,
    });
  }
  await new Promise((resolve) => setTimeout(resolve, 220));
  const afterHover = await readState();

  assert.equal(afterDrag.intent.origin, 'manual');
  assert.notEqual(afterDrag.intent.revision, setup.initial.intent.revision);
  assert.equal(afterDrag.intent.latestOffsetBars < setup.initial.intent.latestOffsetBars, true);
  assert.equal(afterHover.intent.origin, 'manual');
  assert.deepEqual(afterHover.intent, afterDrag.intent);
  assert.deepEqual(afterHover.projection, afterDrag.projection);
  assert.equal(rangesNear(afterHover.visibleRange, afterDrag.visibleRange), true);
  assert.equal(afterHover.appliedViewport.origin, 'manual');
} finally {
  await page.cleanup();
}

console.log('v6 fast right drag stability browser smoke passed');
