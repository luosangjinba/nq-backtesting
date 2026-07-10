import assert from 'node:assert/strict';
import { evaluate } from '../../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './v6-browser-harness.js';

function projectComparableBars(bars = []) {
  return bars.map((bar) => ({
    close: bar.close,
    high: bar.high,
    low: bar.low,
    open: bar.open,
    timestamp: bar.timestamp,
  }));
}

export function ts(value) {
  return Date.parse(value) / 1000;
}

export async function runSessionAwareProjectionBrowserSmoke({
  bars,
  expectedBars,
  expectedBucketKeys,
  targetTimeframe,
}) {
  const page = await openV6Page({ height: 760, width: 1200 });
  try {
    const input = JSON.stringify({
      bars,
      expectedBarCount: expectedBars.length,
      targetTimeframe,
    });
    const value = JSON.parse(await evaluate(page.client, `
      (async () => JSON.stringify(await (async () => {
        const input = ${input};
        const commands = await import('/v6/src/runtime/commands.js');
        const contracts = await import('/v6/src/contracts/app-contracts.js');
        const bars = input.bars;

        await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.REPLACE_BARS, {
          bars,
          cursorTimestamp: bars.at(-1).timestamp,
          paneId: 'main',
        });

        const toggle = document.querySelector('[data-v6-display-timeframe-toggle]');
        toggle.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        document.querySelector(\`[data-v6-display-timeframe-option="\${input.targetTimeframe}"]\`).click();
        const deadline = performance.now() + 5000;
        let chartRecord = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, {
          paneId: 'main',
        });
        let pane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_ACTIVE);
        let projectionState = await commands.dispatchCommand(contracts.CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
        while ((projectionState.lastProjection?.targetTimeframe !== input.targetTimeframe || chartRecord.bars.length !== input.expectedBarCount) && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          chartRecord = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, {
            paneId: 'main',
          });
          pane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_ACTIVE);
          projectionState = await commands.dispatchCommand(contracts.CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
        }

        return {
          bars: chartRecord.bars,
          error: document.querySelector('[data-v6-root]').dataset.lastDisplayTimeframeError || '',
          hasOption: Boolean(document.querySelector(\`[data-v6-display-timeframe-option="\${input.targetTimeframe}"]\`)),
          label: document.querySelector('[data-v6-display-timeframe-label]')?.textContent.trim(),
          menuOpen: toggle.getAttribute('aria-expanded'),
          pane,
          projection: projectionState.lastProjection,
          rootDataset: document.querySelector('[data-v6-root]').dataset.displayTimeframe,
        };
      })()))()
    `));

    assert.equal(value.error, '');
    assert.equal(value.hasOption, true);
    assert.equal(value.rootDataset, targetTimeframe);
    assert.equal(value.label, targetTimeframe);
    assert.equal(value.menuOpen, 'false');
    assert.equal(value.pane.displayTimeframe, targetTimeframe);
    assert.deepEqual(projectComparableBars(value.bars), expectedBars);
    assert.equal(value.projection.sourceTimeframe, 1);
    assert.equal(value.projection.targetTimeframe, targetTimeframe);
    assert.deepEqual(value.projection.buckets.map((bucket) => bucket.key), expectedBucketKeys);
  } finally {
    await page.cleanup();
  }
}
