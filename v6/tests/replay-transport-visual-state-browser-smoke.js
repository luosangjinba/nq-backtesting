import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');

      const waitForInitialApply = async () => {
        const deadline = performance.now() + 5000;
        let replay = await commands.dispatchCommand('replay.getState');
        let chart = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
        while (
          (!replay || replay.cursorIndex !== 0 || replay.status !== 'ready' || !chart.bars?.length) &&
          performance.now() < deadline
        ) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          replay = await commands.dispatchCommand('replay.getState');
          chart = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
        }
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return { chart, replay };
      };

      const waitForReplayStatus = async (status) => {
        const deadline = performance.now() + 5000;
        let replay = await commands.dispatchCommand('replay.getState');
        while (replay?.status !== status && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          replay = await commands.dispatchCommand('replay.getState');
        }
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return replay;
      };

      const snapshot = () => {
        const root = document.querySelector('[data-v6-transport]');
        const play = document.querySelector('[data-v6-transport-action="play-toggle"]');
        const next = document.querySelector('[data-v6-transport-action="next"]');
        const restart = document.querySelector('[data-v6-transport-action="restart"]');
        const speed = document.querySelector('[data-v6-transport-speed-slider]');
        const periodTrigger = document.querySelector('[data-v6-transport-period-toggle]');
        const sync = document.querySelector('[data-v6-transport-period-sync]');
        const selectedPeriod = document.querySelector('[data-v6-transport-period-option].is-active');
        const playStyle = getComputedStyle(play);
        const restartStyle = getComputedStyle(restart);
        const statusBar = document.querySelector('[data-v6-status-bar]');
        const protection = document.querySelector('[data-v6-replay-protection]');
        return {
          compactStatus: {
            diagnostics: JSON.parse(statusBar.getAttribute('data-v6-replay-diagnostics')),
            kind: statusBar.dataset.replayStatusKind,
            message: document.querySelector('[data-v6-replay-status]').textContent.trim(),
            protectionHidden: protection.hidden,
            protectionMessage: protection.textContent.trim(),
          },
          dataset: {
            ended: root.dataset.ended,
            playback: root.dataset.playback,
            playbackStatus: root.dataset.playbackStatus,
            period: root.dataset.period,
            periodSync: root.dataset.periodSync,
            speed: root.dataset.speed,
          },
          next: {
            disabled: next.disabled,
            label: next.getAttribute('aria-label'),
            title: next.getAttribute('title'),
          },
          period: {
            label: document.querySelector('[data-v6-transport-period-label]').textContent.trim(),
            selected: selectedPeriod?.dataset.v6TransportPeriodOption || null,
            triggerLabel: periodTrigger.getAttribute('aria-label'),
            triggerTitle: periodTrigger.getAttribute('title'),
          },
          play: {
            active: play.classList.contains('is-active'),
            disabled: play.disabled,
            disabledClass: play.classList.contains('is-disabled'),
            label: play.getAttribute('aria-label'),
            pressed: play.getAttribute('aria-pressed'),
            title: play.getAttribute('title'),
            opacity: playStyle.opacity,
          },
          restart: {
            active: restart.classList.contains('is-active'),
            disabled: restart.disabled,
            disabledClass: restart.classList.contains('is-disabled'),
            label: restart.getAttribute('aria-label'),
            title: restart.getAttribute('title'),
            opacity: restartStyle.opacity,
          },
          speed: {
            ariaValueText: speed.getAttribute('aria-valuetext'),
            value: speed.value,
          },
          sync: {
            ariaChecked: sync.getAttribute('aria-checked'),
            checked: sync.checked,
            parentActive: sync.parentElement.classList.contains('is-active'),
            title: sync.getAttribute('title'),
          },
        };
      };

      await commands.dispatchCommand('session.create', {
        endTime: '2026-06-01T09:34:00.000Z',
        startTime: '2026-06-01T09:30:00.000Z',
        symbol: 'NQ',
        timeframe: '1m',
      });
      const initial = await waitForInitialApply();
      const ready = snapshot();

      document.querySelector('[data-v6-transport-period-details]').open = true;
      document.querySelector('[data-v6-transport-period-option="3m"]').click();
      const manualPeriodDeadline = performance.now() + 3000;
      let manualPeriodState = await commands.dispatchCommand('playbackPeriod.getState');
      while ((manualPeriodState.period !== '3m' || manualPeriodState.sync !== false) && performance.now() < manualPeriodDeadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        manualPeriodState = await commands.dispatchCommand('playbackPeriod.getState');
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const manualPeriod = snapshot();

      const syncToggle = document.querySelector('[data-v6-transport-period-sync]');
      syncToggle.checked = true;
      syncToggle.dispatchEvent(new Event('change', { bubbles: true }));
      const periodDeadline = performance.now() + 3000;
      let periodState = await commands.dispatchCommand('playbackPeriod.getState');
      while ((periodState.period !== '3m' || periodState.sync !== true) && performance.now() < periodDeadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        periodState = await commands.dispatchCommand('playbackPeriod.getState');
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const periodSynced = snapshot();

      document.querySelector('[data-v6-transport-action="play-toggle"]').click();
      const playing = await waitForReplayStatus('playing');
      const playingSnapshot = snapshot();

      document.querySelector('[data-v6-transport-action="play-toggle"]').click();
      await waitForReplayStatus('paused');
      const pausedSnapshot = snapshot();

      await commands.dispatchCommand('playbackPeriod.setPeriod', { period: '15m' });
      document.querySelector('[data-v6-transport-action="play-toggle"]').click();
      const ended = await waitForReplayStatus('ended');
      const endedSnapshot = snapshot();

      const beforeDisabled = await commands.dispatchCommand('replay.getState');
      document.querySelector('[data-v6-transport-action="play-toggle"]').click();
      document.querySelector('[data-v6-transport-action="next"]').click();
      document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ' ' }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const afterDisabled = await commands.dispatchCommand('replay.getState');
      const disabledActionSnapshot = snapshot();

      document.querySelector('[data-v6-transport-action="restart"]').click();
      const restartDeadline = performance.now() + 5000;
      let restarted = await commands.dispatchCommand('replay.getState');
      while (
        (!restarted || restarted.status !== 'ready' || restarted.cursorIndex !== 0) &&
        performance.now() < restartDeadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        restarted = await commands.dispatchCommand('replay.getState');
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const restartedSnapshot = snapshot();

      return {
        afterDisabled,
        beforeDisabled,
        disabledActionSnapshot,
        ended,
        endedSnapshot,
        initial,
        manualPeriod,
        manualPeriodState,
        periodState,
        periodSynced,
        pausedSnapshot,
        playing,
        playingSnapshot,
        ready,
        restarted,
        restartedSnapshot,
      };
    })()))()
  `));

  assert.equal(value.initial.replay.status, 'ready');
  assert.equal(value.ready.dataset.playbackStatus, 'ready');
  assert.equal(value.ready.dataset.ended, 'false');
  assert.equal(value.ready.play.disabled, false);
  assert.equal(value.ready.play.active, false);
  assert.equal(value.ready.play.label, 'Play replay');
  assert.equal(value.ready.next.disabled, false);
  assert.equal(value.ready.restart.disabled, true);
  assert.equal(value.ready.restart.disabledClass, true);
  assert.equal(value.ready.restart.label, 'Restart available after replay ends');
  assert.equal(value.ready.period.label, '1m');
  assert.equal(value.ready.period.selected, '1m');
  assert.equal(value.ready.sync.checked, false);
  assert.equal(value.ready.compactStatus.kind, 'ready');
  assert.equal(value.ready.compactStatus.message, 'Replay ready');
  assert.equal(value.ready.compactStatus.protectionHidden, false);
  assert.equal(value.ready.compactStatus.protectionMessage, 'Future data hidden');

  assert.equal(value.manualPeriodState.period, '3m');
  assert.equal(value.manualPeriodState.sync, false);
  assert.equal(value.manualPeriod.dataset.period, '3m');
  assert.equal(value.manualPeriod.dataset.periodSync, 'false');
  assert.equal(value.manualPeriod.period.label, '3m');
  assert.equal(value.manualPeriod.period.selected, '3m');
  assert.equal(value.manualPeriod.period.triggerTitle, 'Replay step period 3m');

  assert.equal(value.periodState.period, '1m');
  assert.equal(value.periodState.sync, true);
  assert.equal(value.periodSynced.dataset.period, '1m');
  assert.equal(value.periodSynced.dataset.periodSync, 'true');
  assert.equal(value.periodSynced.period.label, '1m');
  assert.equal(value.periodSynced.period.selected, '1m');
  assert.equal(value.periodSynced.period.triggerTitle, 'Replay step period 1m');
  assert.equal(value.periodSynced.sync.checked, true);
  assert.equal(value.periodSynced.sync.ariaChecked, 'true');
  assert.equal(value.periodSynced.sync.parentActive, true);

  assert.equal(value.playing.status, 'playing');
  assert.equal(value.playingSnapshot.dataset.playback, 'playing');
  assert.equal(value.playingSnapshot.play.active, true);
  assert.equal(value.playingSnapshot.play.disabled, false);
  assert.equal(value.playingSnapshot.play.label, 'Pause replay');
  assert.equal(value.playingSnapshot.play.pressed, 'true');
  assert.equal(value.playingSnapshot.restart.disabled, true);
  assert.equal(value.playingSnapshot.next.disabled, false);
  assert.equal(value.playingSnapshot.compactStatus.message, 'Replay ready');
  assert.equal(value.playingSnapshot.compactStatus.diagnostics.runtimeStatus, 'playing');
  assert.equal(value.pausedSnapshot.compactStatus.message, 'Replay ready');
  assert.equal(value.pausedSnapshot.compactStatus.diagnostics.runtimeStatus, 'paused');

  assert.equal(value.ended.status, 'ended');
  assert.equal(value.endedSnapshot.dataset.ended, 'true');
  assert.equal(value.endedSnapshot.play.disabled, true);
  assert.equal(value.endedSnapshot.play.disabledClass, true);
  assert.equal(value.endedSnapshot.play.label, 'Replay ended');
  assert.equal(value.endedSnapshot.next.disabled, true);
  assert.equal(value.endedSnapshot.next.label, 'Replay ended');
  assert.equal(value.endedSnapshot.restart.disabled, false);
  assert.equal(value.endedSnapshot.restart.active, true);
  assert.equal(value.endedSnapshot.restart.disabledClass, false);
  assert.equal(value.endedSnapshot.restart.label, 'Restart replay');
  assert.equal(value.endedSnapshot.compactStatus.kind, 'complete');
  assert.equal(value.endedSnapshot.compactStatus.message, 'Replay complete');
  assert.equal(value.endedSnapshot.compactStatus.protectionHidden, true);
  assert.equal(value.endedSnapshot.compactStatus.diagnostics.hiddenCount, 0);
  assert.equal(value.beforeDisabled.cursorIndex, value.afterDisabled.cursorIndex);
  assert.equal(value.beforeDisabled.revealedCount, value.afterDisabled.revealedCount);
  assert.equal(value.disabledActionSnapshot.dataset.ended, 'true');

  assert.equal(value.restarted.status, 'ready');
  assert.equal(value.restarted.cursorIndex, 0);
  assert.equal(value.restartedSnapshot.dataset.ended, 'false');
  assert.equal(value.restartedSnapshot.play.disabled, false);
  assert.equal(value.restartedSnapshot.play.label, 'Play replay');
  assert.equal(value.restartedSnapshot.restart.disabled, true);
  assert.equal(value.restartedSnapshot.restart.disabledClass, true);
  assert.equal(value.restartedSnapshot.compactStatus.message, 'Replay ready');
  assert.equal(value.restartedSnapshot.compactStatus.protectionHidden, false);
  assert.equal(value.restartedSnapshot.compactStatus.diagnostics.runtimeStatus, 'ready');
} finally {
  await page.cleanup();
}

console.log('v6 replay transport visual state browser smoke passed');
