import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commandsModule = await import('/v6/src/runtime/commands.js');
      const root = document.querySelector('[data-v6-root]');
      const host = document.querySelector('[data-v6-chart-engine-host]');

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const deadline = performance.now() + 4000;
      let applyState = await commandsModule.dispatchCommand('chartEntryProjectionApply.getState');
      while (applyState.status === 'idle' && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        applyState = await commandsModule.dispatchCommand('chartEntryProjectionApply.getState');
      }

      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const chartDataSummary = await commandsModule.dispatchCommand('chartData.getSummary');
      const chartRecord = await commandsModule.dispatchCommand('chartData.getBars', { paneId: 'main' });
      const viewportRecord = await commandsModule.dispatchCommand('chartViewport.getPane', { paneId: 'main' });
      const surfaceState = root.__v6WorkstationChartSurface.getState();
      const paneSnapshot = surfaceState.panes[0]?.snapshot || {};
      const latestLogicalIndex = Math.max(0, (chartRecord.bars?.length || 0) - 1);
      const visibleRange = paneSnapshot.visibleLogicalRange;
      const latestVisible = Boolean(
        visibleRange &&
        Number(visibleRange.from) <= latestLogicalIndex &&
        Number(visibleRange.to) >= latestLogicalIndex
      );

      const canvases = [...host.querySelectorAll('canvas')];
      let candlePixelCount = 0;
      let sampledPixelCount = 0;
      for (const canvas of canvases) {
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) continue;
        const width = canvas.width;
        const height = canvas.height;
        const stepX = Math.max(1, Math.floor(width / 96));
        const stepY = Math.max(1, Math.floor(height / 48));
        for (let y = 0; y < height; y += stepY) {
          for (let x = 0; x < width; x += stepX) {
            const [red, green, blue, alpha] = context.getImageData(x, y, 1, 1).data;
            sampledPixelCount += 1;
            const greenCandle = green > 120 && red < 120 && blue < 180;
            const redCandle = red > 170 && green < 140 && blue < 160;
            if (alpha > 0 && (greenCandle || redCandle)) {
              candlePixelCount += 1;
            }
          }
        }
      }

      return {
        applyState,
        canvasCount: canvases.length,
        candlePixelCount,
        chartDataSummary,
        chartRecordBarCount: chartRecord.bars?.length || 0,
        hostVisible: Boolean(host && host.getBoundingClientRect().width > 0 && host.getBoundingClientRect().height > 0),
        latestLogicalIndex,
        latestVisible,
        sampledPixelCount,
        surfaceAppliedChartData: surfaceState.appliedChartData,
        surfaceAppliedViewport: surfaceState.appliedViewport,
        surfacePaneDataLength: paneSnapshot.dataLength || 0,
        surfaceVisibleRange: visibleRange,
        viewportProjection: viewportRecord.projection || null,
      };
    })()))()
  `));

  assert.equal(value.applyState.status, 'applied');
  assert.equal(value.hostVisible, true);
  assert.equal(value.chartDataSummary.paneCount, 1);
  assert.equal(value.chartRecordBarCount > 0, true);
  assert.equal(value.surfacePaneDataLength, value.chartRecordBarCount);
  assert.equal(value.surfaceAppliedChartData[0].barCount, value.chartRecordBarCount);
  assert.equal(value.surfaceAppliedViewport[0].paneId, 'main');
  assert.equal(Boolean(value.viewportProjection), true);
  assert.deepEqual(value.surfaceVisibleRange, {
    from: value.viewportProjection.from,
    to: value.viewportProjection.to,
  });
  assert.equal(value.latestVisible, true);
  assert.equal(value.canvasCount > 0, true);
  assert.equal(value.sampledPixelCount > 0, true);
  assert.equal(value.candlePixelCount > 0, true);
} finally {
  await page.cleanup();
}

console.log('v6 chart entry initial visibility browser smoke passed');
