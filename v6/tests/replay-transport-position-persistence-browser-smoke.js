import assert from 'node:assert/strict';
import {
  evaluate,
  waitForExpression,
} from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const STORAGE_KEY = 'v6.replayTransport.position';

const page = await openV6Page({ height: 820, width: 1360 });
try {
  async function reloadAndWait() {
    await page.client.send('Page.reload', { ignoreCache: true });
    await waitForExpression(page.client, `document.querySelector('[data-v6-root]')?.dataset.booted === 'true'`, 8000);
  }

  const initial = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const storageKey = ${JSON.stringify(STORAGE_KEY)};
      localStorage.removeItem(storageKey);

      const waitForReady = async () => {
        const deadline = performance.now() + 5000;
        let replay = await commands.dispatchCommand('replay.getState');
        while ((!replay || replay.status !== 'ready') && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          replay = await commands.dispatchCommand('replay.getState');
        }
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return replay;
      };

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const replayBeforeDrag = await waitForReady();
      const viewportBeforeDrag = await commands.dispatchCommand('chartViewport.getPane', { paneId: 'main' });
      const transport = document.querySelector('[data-v6-transport]');
      const handle = document.querySelector('[data-v6-transport-drag-handle]');
      const beforeRect = transport.getBoundingClientRect();

      handle.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: beforeRect.left + 8,
        clientY: beforeRect.top + 8,
        pointerId: 1,
      }));
      document.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true,
        clientX: 320,
        clientY: 220,
        pointerId: 1,
      }));
      document.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true,
        clientX: 320,
        clientY: 220,
        pointerId: 1,
      }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const afterRect = transport.getBoundingClientRect();
      const statusRect = document.querySelector('[data-v6-status-bar]').getBoundingClientRect();
      const replayAfterDrag = await commands.dispatchCommand('replay.getState');
      const viewportAfterDrag = await commands.dispatchCommand('chartViewport.getPane', { paneId: 'main' });
      const stored = JSON.parse(localStorage.getItem(storageKey));

      return {
        afterRect: {
          bottom: afterRect.bottom,
          height: afterRect.height,
          left: afterRect.left,
          right: afterRect.right,
          top: afterRect.top,
          width: afterRect.width,
        },
        beforeRect: {
          left: beforeRect.left,
          top: beforeRect.top,
        },
        replayAfterDrag,
        replayBeforeDrag,
        stored,
        statusTop: statusRect.top,
        transportDragged: transport.dataset.dragged,
        viewportAfterDrag,
        viewportBeforeDrag,
        windowSize: {
          height: window.innerHeight,
          width: window.innerWidth,
        },
      };
    })()))()
  `));

  assert.equal(initial.transportDragged, 'true');
  assert.equal(initial.afterRect.left, initial.stored.left);
  assert.equal(initial.afterRect.top, initial.stored.top);
  assert.equal(initial.afterRect.width, initial.stored.width);
  assert.equal(initial.afterRect.height, initial.stored.height);
  assert.equal(initial.replayAfterDrag.cursorIndex, initial.replayBeforeDrag.cursorIndex);
  assert.equal(initial.replayAfterDrag.revealedCount, initial.replayBeforeDrag.revealedCount);
  assert.deepEqual(initial.viewportAfterDrag.intent, initial.viewportBeforeDrag.intent);
  assert.equal(initial.afterRect.left >= 0, true);
  assert.equal(initial.afterRect.top >= 0, true);
  assert.equal(initial.afterRect.right <= initial.windowSize.width, true);
  assert.equal(initial.afterRect.bottom <= initial.windowSize.height, true);
  assert.equal(initial.afterRect.bottom <= initial.statusTop - 8, true);

  await reloadAndWait();
  const restored = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const waitForReady = async () => {
        const deadline = performance.now() + 5000;
        let replay = await commands.dispatchCommand('replay.getState');
        while ((!replay || replay.status !== 'ready') && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          replay = await commands.dispatchCommand('replay.getState');
        }
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return replay;
      };
      document.querySelector('[data-v6-dashboard-create-session]').click();
      await waitForReady();
      const transport = document.querySelector('[data-v6-transport]');
      const rect = transport.getBoundingClientRect();
      const statusRect = document.querySelector('[data-v6-status-bar]').getBoundingClientRect();
      return {
        positionRestored: transport.dataset.positionRestored,
        statusTop: statusRect.top,
        rect: {
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          top: rect.top,
        },
        windowSize: {
          height: window.innerHeight,
          width: window.innerWidth,
        },
      };
    })()))()
  `));

  assert.equal(restored.positionRestored, 'true');
  assert.equal(restored.rect.left, initial.afterRect.left);
  assert.equal(restored.rect.top, initial.afterRect.top);
  assert.equal(restored.rect.right <= restored.windowSize.width, true);
  assert.equal(restored.rect.bottom <= restored.windowSize.height, true);
  assert.equal(restored.rect.bottom <= restored.statusTop - 8, true);

  await evaluate(page.client, `
    localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify({
      height: ${initial.afterRect.height},
      left: 99999,
      top: 99999,
      width: ${initial.afterRect.width}
    }))
  `);
  await reloadAndWait();
  const clamped = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const waitForReady = async () => {
        const deadline = performance.now() + 5000;
        let replay = await commands.dispatchCommand('replay.getState');
        while ((!replay || replay.status !== 'ready') && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          replay = await commands.dispatchCommand('replay.getState');
        }
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return replay;
      };
      document.querySelector('[data-v6-dashboard-create-session]').click();
      await waitForReady();
      const transport = document.querySelector('[data-v6-transport]');
      const rect = transport.getBoundingClientRect();
      const statusRect = document.querySelector('[data-v6-status-bar]').getBoundingClientRect();
      const stored = JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}));
      return {
        rect: {
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          top: rect.top,
        },
        stored,
        statusTop: statusRect.top,
        windowSize: {
          height: window.innerHeight,
          width: window.innerWidth,
        },
      };
    })()))()
  `));

  assert.equal(clamped.rect.right <= clamped.windowSize.width, true);
  assert.equal(clamped.rect.bottom <= clamped.windowSize.height, true);
  assert.equal(clamped.rect.bottom <= clamped.statusTop - 8, true);
  assert.equal(clamped.rect.left, clamped.stored.left);
  assert.equal(clamped.rect.top, clamped.stored.top);
} finally {
  await page.cleanup();
}

console.log('v6 replay transport position persistence browser smoke passed');
