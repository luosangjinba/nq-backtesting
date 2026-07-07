import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 760, width: 1200 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const commands = await import('/v6/src/runtime/commands.js');
      const root = document.querySelector('[data-v6-root]');
      await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, {
        cursorTimestamp: 1780306200,
        latestOffsetBars: 8,
        paneId: 'main',
      });
      await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.REPLACE_BARS, {
        bars: [
          { timestamp: 1780306200, open: 100, high: 101, low: 99, close: 100.5 },
          { timestamp: 1780306260, open: 100.5, high: 102, low: 100, close: 101.5 },
          { timestamp: 1780306320, open: 101.5, high: 103, low: 101, close: 102.5 },
        ],
        paneId: 'main',
      });
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const state = root.__v6WorkstationChartSurface.getState();
      return {
        appliedViewport: state.appliedViewport,
        bridgeMounted: Boolean(root.__v6ChartViewportSurfaceBridge?.destroy),
        visibleLogicalRange: state.panes[0].snapshot.visibleLogicalRange,
      };
    })()))()
  `));

  assert.equal(value.bridgeMounted, true);
  assert.deepEqual(value.visibleLogicalRange, { from: -110, to: 10 });
  assert.deepEqual(value.appliedViewport, [{
    chartBarsRevision: 1,
    from: -110,
    origin: 'default',
    paneId: 'main',
    projectionRevision: 0,
    to: 10,
  }]);
} finally {
  await page.cleanup();
}

console.log('v6 workstation chart viewport bridge browser smoke passed');
