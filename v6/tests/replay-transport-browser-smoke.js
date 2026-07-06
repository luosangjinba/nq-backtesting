import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 760, width: 1200 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const root = document.querySelector('[data-v6-root]');
      const transport = root.__v6ReplayTransport;
      const nextButton = document.querySelector('[data-v6-transport-action="next"]');
      const playButton = document.querySelector('[data-v6-transport-action="play-toggle"]');
      const speedSlider = document.querySelector('[data-v6-transport-speed-slider]');
      const periodDetails = document.querySelector('[data-v6-transport-period-details]');
      const transportRoot = document.querySelector('[data-v6-transport]');

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyDeadline = performance.now() + 5000;
      let applyState = await commands.dispatchCommand('chartEntryProjectionApply.getState');
      while (applyState.status === 'idle' && performance.now() < applyDeadline) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        applyState = await commands.dispatchCommand('chartEntryProjectionApply.getState');
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const beforeNextChart = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
      nextButton.click();
      let manualNextState = await commands.dispatchCommand('chartEntryManualNext.getState');
      const nextDeadline = performance.now() + 5000;
      while (manualNextState.status === 'idle' && performance.now() < nextDeadline) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        manualNextState = await commands.dispatchCommand('chartEntryManualNext.getState');
      }
      const afterClickNextChart = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
      const afterClickNextReplay = await commands.dispatchCommand('replay.getState');

      speedSlider.value = '2';
      speedSlider.dispatchEvent(new Event('input', { bubbles: true }));
      const speedState = transport.getState();
      const replayAfterSpeed = await commands.dispatchCommand('replay.getState');

      playButton.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
      const afterClickPlay = {
        autoState: await commands.dispatchCommand('chartEntryAutoPlay.getState'),
        buttonLabel: playButton.getAttribute('aria-label'),
        buttonPressed: playButton.getAttribute('aria-pressed'),
        state: transport.getState(),
      };

      playButton.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
      const afterClickPause = {
        autoState: await commands.dispatchCommand('chartEntryAutoPlay.getState'),
        buttonLabel: playButton.getAttribute('aria-label'),
        buttonPressed: playButton.getAttribute('aria-pressed'),
        state: transport.getState(),
      };

      document.dispatchEvent(new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'Space',
        key: ' ',
      }));
      await new Promise((resolve) => setTimeout(resolve, 50));
      const afterSpacePlay = {
        autoState: await commands.dispatchCommand('chartEntryAutoPlay.getState'),
        replayState: await commands.dispatchCommand('replay.getState'),
      };

      playButton.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
      const afterKeyboardClickPause = {
        autoState: await commands.dispatchCommand('chartEntryAutoPlay.getState'),
        replayState: await commands.dispatchCommand('replay.getState'),
      };

      const beforeKeyboardNextChart = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
      const beforeKeyboardNextReplay = await commands.dispatchCommand('replay.getState');
      document.dispatchEvent(new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'ArrowRight',
      }));
      let afterKeyboardNextReplay = await commands.dispatchCommand('replay.getState');
      let afterKeyboardNextChart = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
      const keyboardNextDeadline = performance.now() + 5000;
      while (
        (
          afterKeyboardNextReplay.cursorIndex <= beforeKeyboardNextReplay.cursorIndex ||
          (afterKeyboardNextChart.bars?.length || 0) <= (beforeKeyboardNextChart.bars?.length || 0)
        ) &&
        performance.now() < keyboardNextDeadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        afterKeyboardNextReplay = await commands.dispatchCommand('replay.getState');
        afterKeyboardNextChart = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
      }
      document.querySelector('[data-v6-transport-period-toggle]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const dragHandle = document.querySelector('[data-v6-transport-drag-handle]');
      const beforeDragRect = transportRoot.getBoundingClientRect();
      dragHandle.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: beforeDragRect.left + 10,
        clientY: beforeDragRect.top + 10,
        pointerId: 1,
      }));
      document.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true,
        clientX: 28,
        clientY: 72,
        pointerId: 1,
      }));
      document.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true,
        clientX: 28,
        clientY: 72,
        pointerId: 1,
      }));
      await new Promise((resolve) => setTimeout(resolve, 0));
      const afterDragRect = transportRoot.getBoundingClientRect();

      return {
        afterClickNextBarCount: afterClickNextChart.bars?.length || 0,
        afterClickNextReplay,
        afterClickPause,
        afterClickPlay,
        afterKeyboardClickPause,
        afterKeyboardNextBarCount: afterKeyboardNextChart.bars?.length || 0,
        afterKeyboardNextReplay,
        afterSpacePlay,
        beforeKeyboardNextBarCount: beforeKeyboardNextChart.bars?.length || 0,
        beforeKeyboardNextReplay,
        beforeNextBarCount: beforeNextChart.bars?.length || 0,
        afterDragRect: {
          bottom: afterDragRect.bottom,
          left: afterDragRect.left,
          right: afterDragRect.right,
          top: afterDragRect.top,
        },
        beforeDragRect: {
          left: beforeDragRect.left,
          top: beforeDragRect.top,
        },
        dragHandleExists: Boolean(dragHandle),
        nestedInChart: Boolean(document.querySelector('[data-v6-chart-surface] [data-v6-transport]')),
        periodMenuOpen: periodDetails.open,
        periodOptions: [...document.querySelectorAll('[data-v6-transport-period-menu] button')].map((button) => button.textContent.trim()),
        syncToggleExists: Boolean(document.querySelector('[data-v6-transport-period-sync]')),
        speedSliderValue: speedSlider.value,
        speedState,
        replayAfterSpeed,
        transportDataset: {
          playback: document.querySelector('[data-v6-transport]').dataset.playback,
          speed: document.querySelector('[data-v6-transport]').dataset.speed,
        },
        transportDragged: transportRoot.dataset.dragged,
        transportPosition: getComputedStyle(transportRoot).position,
        viewport: {
          height: window.innerHeight,
          width: window.innerWidth,
        },
      };
    })()))()
  `));

  assert.equal(value.afterClickNextBarCount, value.beforeNextBarCount + 1);
  assert.equal(value.afterClickNextReplay.cursorIndex, value.replayAfterSpeed.cursorIndex);
  assert.equal(value.speedState.speed, 2);
  assert.equal(value.speedSliderValue, '2');
  assert.equal(value.transportDataset.speed, '2');
  assert.equal(value.afterClickPlay.state.playing, true);
  assert.equal(value.afterClickPlay.state.speed, 2);
  assert.equal(value.afterClickPlay.autoState.playing, true);
  assert.equal(value.afterClickPlay.buttonLabel, 'Pause replay');
  assert.equal(value.afterClickPlay.buttonPressed, 'true');
  assert.equal(value.afterClickPause.state.playing, false);
  assert.equal(value.afterClickPause.state.speed, 2);
  assert.equal(value.afterClickPause.autoState.playing, false);
  assert.equal(value.afterClickPause.buttonLabel, 'Play replay');
  assert.equal(value.afterClickPause.buttonPressed, 'false');
  assert.equal(value.afterSpacePlay.autoState.playing, true);
  assert.equal(value.afterSpacePlay.replayState.status, 'playing');
  assert.equal(value.afterKeyboardClickPause.autoState.playing, false);
  assert.equal(value.afterKeyboardClickPause.replayState.status, 'paused');
  assert.equal(value.afterKeyboardNextReplay.cursorIndex, value.beforeKeyboardNextReplay.cursorIndex + 1);
  assert.equal(value.afterKeyboardNextBarCount, value.beforeKeyboardNextBarCount + 1);
  assert.equal(value.dragHandleExists, true);
  assert.equal(value.nestedInChart, false);
  assert.equal(value.transportPosition, 'fixed');
  assert.equal(value.transportDragged, 'true');
  assert.equal(value.afterDragRect.left >= 0, true);
  assert.equal(value.afterDragRect.top >= 0, true);
  assert.equal(value.afterDragRect.right <= value.viewport.width, true);
  assert.equal(value.afterDragRect.bottom <= value.viewport.height, true);
  assert.equal(value.afterDragRect.left !== value.beforeDragRect.left || value.afterDragRect.top !== value.beforeDragRect.top, true);
  assert.equal(value.periodMenuOpen, true);
  assert.deepEqual(value.periodOptions, ['1s', '5s', '10s', '15s', '30s', '1m', '3m', '5m']);
  assert.equal(value.syncToggleExists, true);
} finally {
  await page.cleanup();
}

console.log('v6 replay transport browser smoke passed');
