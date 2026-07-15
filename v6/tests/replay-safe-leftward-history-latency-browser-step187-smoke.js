import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });

async function readState() {
  return JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');
      const chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      const history = await commands.dispatchCommand(contracts.CHART_HISTORY_COMMANDS.GET_STATE);
      const replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const viewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'main' });
      const surface = root.__v6WorkstationChartSurface.getState();
      const latestLogicalIndex = Math.max(0, (chart.bars?.length || 0) - 1);
      const visibleRange = surface.panes[0]?.snapshot?.visibleLogicalRange || null;
      return {
        barCount: chart.bars?.length || 0,
        history,
        latestTimestamp: chart.bars?.at(-1)?.timestamp || null,
        latestVisible: Boolean(
          visibleRange &&
          Number(visibleRange.from) <= latestLogicalIndex &&
          Number(visibleRange.to) >= latestLogicalIndex
        ),
        oldestTimestamp: chart.bars?.[0]?.timestamp || null,
        replay,
        viewport,
        visibleRange,
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
  const initial = await readState();
  assert.equal(initial.latestVisible, true);

  const x = setup.hostRect.left + (setup.hostRect.width * 0.42);
  const y = setup.hostRect.top + (setup.hostRect.height * 0.54);
  let beforeNext = null;
  for (const deltaX of [-960, 960, -1280, 1280, -1600, 1600, -2200, 2200]) {
    await page.client.send('Input.dispatchMouseEvent', {
      deltaX: 0,
      deltaY: -520,
      type: 'mouseWheel',
      x,
      y,
    });
    await page.client.send('Input.dispatchMouseEvent', {
      deltaX,
      deltaY: 0,
      type: 'mouseWheel',
      x,
      y,
    });
    await new Promise((resolve) => setTimeout(resolve, 80));
    const candidate = await readState();
    if (
      Number(candidate.visibleRange?.from) < 0 &&
      candidate.barCount === initial.barCount &&
      Number(candidate.visibleRange?.to) < Number(initial.visibleRange?.to)
    ) {
      beforeNext = candidate;
      break;
    }
  }
  if (!beforeNext) {
    const fallbackRange = initial.visibleRange
      ? {
        from: Math.min(-8, Number(initial.visibleRange.from) - 24),
        to: Math.max(8, Number(initial.visibleRange.to) - 24),
      }
      : { from: -24, to: 8 };
    await evaluate(page.client, `
      (async () => {
        const commands = await import('/v6/src/runtime/commands.js');
        const contracts = await import('/v6/src/contracts/app-contracts.js');
        const root = document.querySelector('[data-v6-root]');
        root.__v6Step187HistoryPromise = commands.dispatchCommand(
          contracts.CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION,
          {
            paneId: 'main',
            visibleRange: ${JSON.stringify(fallbackRange)},
          },
        );
      })()
    `);
    await new Promise((resolve) => setTimeout(resolve, 10));
    beforeNext = await readState();
  }
  assert.notEqual(beforeNext, null);
  await page.client.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: setup.hostRect.left + (setup.hostRect.width * 0.5),
    y: setup.hostRect.top + (setup.hostRect.height * 0.5),
  });
  const nextMeasurement = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const startedAt = performance.now();
      const result = await commands.dispatchCommand(contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT);
      return {
        latencyMs: performance.now() - startedAt,
        result,
      };
    })()))()
  `));
  await new Promise((resolve) => setTimeout(resolve, 40));
  const afterNext = await readState();

  assert.equal(nextMeasurement.result.status, 'advanced', nextMeasurement.result.error || 'manual next should advance');
  assert.equal(
    nextMeasurement.latencyMs < 160,
    true,
    `manual next command latency ${nextMeasurement.latencyMs.toFixed(1)}ms exceeded 160ms`,
  );
  assert.equal(afterNext.replay.cursorIndex, initial.replay.cursorIndex + 1);
  assert.equal(afterNext.replay.revealedCount, initial.replay.revealedCount + 1);
  assert.equal(afterNext.barCount >= initial.barCount + 1, true);
  assert.equal(afterNext.latestTimestamp > initial.latestTimestamp, true);
  assert.equal(afterNext.latestVisible, true);
  assert.equal(
    ['idle', 'ignored', 'loaded'].includes(afterNext.history.status),
    true,
  );

  assert.equal(beforeNext.barCount >= initial.barCount, true);
  console.log(`v6 replay-safe leftward history manual-next latency ${nextMeasurement.latencyMs.toFixed(1)}ms`);
} finally {
  await page.cleanup();
}

console.log('v6 replay-safe leftward history latency browser step 187 smoke passed');
