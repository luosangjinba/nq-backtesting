import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });
try {
  const value = JSON.parse(await evaluate(page.client, `
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
      const ready = await waitForReady();

      const focusSnapshot = (selector, outlineTargetSelector = selector) => {
        const element = document.querySelector(selector);
        element.focus();
        const outlineTarget = document.querySelector(outlineTargetSelector);
        const style = getComputedStyle(outlineTarget);
        return {
          activeMatches: document.activeElement === element,
          outlineColor: style.outlineColor,
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
        };
      };

      const focus = {
        grip: focusSnapshot('[data-v6-transport-drag-handle]'),
        next: focusSnapshot('[data-v6-transport-action="next"]'),
        period: focusSnapshot('[data-v6-transport-period-toggle]'),
        play: focusSnapshot('[data-v6-transport-action="play-toggle"]'),
        speed: focusSnapshot('[data-v6-transport-speed-slider]'),
        sync: focusSnapshot('[data-v6-transport-period-sync]', '.transport-sync-toggle span'),
      };

      const details = document.querySelector('[data-v6-transport-period-details]');
      const trigger = document.querySelector('[data-v6-transport-period-toggle]');
      trigger.focus();
      trigger.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const afterArrowDown = {
        activePeriod: document.activeElement?.dataset.v6TransportPeriodOption || null,
        open: details.open,
      };

      document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'End' }));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const afterEnd = {
        activePeriod: document.activeElement?.dataset.v6TransportPeriodOption || null,
        open: details.open,
      };

      const beforeSuppressed = await commands.dispatchCommand('replay.getState');
      document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));
      document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ' ' }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const afterSuppressed = await commands.dispatchCommand('replay.getState');

      document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const afterEscape = {
        activeIsTrigger: document.activeElement === trigger,
        open: details.open,
      };

      const input = document.createElement('input');
      input.setAttribute('data-v6-keyboard-test-input', 'true');
      document.body.appendChild(input);
      input.focus();
      const beforeEditable = await commands.dispatchCommand('replay.getState');
      input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));
      input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ' ' }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const afterEditable = await commands.dispatchCommand('replay.getState');

      return {
        afterEditable,
        afterEnd,
        afterEscape,
        afterArrowDown,
        afterSuppressed,
        beforeEditable,
        beforeSuppressed,
        focus,
        ready,
      };
    })()))()
  `));

  assert.equal(value.ready.status, 'ready');
  for (const [name, snapshot] of Object.entries(value.focus)) {
    assert.equal(snapshot.activeMatches, true, name);
    assert.equal(snapshot.outlineStyle, 'solid', name);
    assert.equal(snapshot.outlineWidth, '2px', name);
  }
  assert.equal(value.afterArrowDown.open, true);
  assert.equal(value.afterArrowDown.activePeriod, '1m');
  assert.equal(value.afterEnd.open, true);
  assert.equal(value.afterEnd.activePeriod, '4h');
  assert.equal(value.beforeSuppressed.cursorIndex, value.afterSuppressed.cursorIndex);
  assert.equal(value.beforeSuppressed.revealedCount, value.afterSuppressed.revealedCount);
  assert.equal(value.afterEscape.open, false);
  assert.equal(value.afterEscape.activeIsTrigger, true);
  assert.equal(value.beforeEditable.cursorIndex, value.afterEditable.cursorIndex);
  assert.equal(value.beforeEditable.revealedCount, value.afterEditable.revealedCount);
} finally {
  await page.cleanup();
}

console.log('v6 replay transport focus keyboard browser smoke passed');
