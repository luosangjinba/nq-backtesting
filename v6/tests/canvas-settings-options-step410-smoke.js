import assert from 'node:assert/strict';
import { createCanvasSettingsChartOptions } from '../src/chart-engine/canvas-settings-options.js';

const defaults = {
  crosshair: { horzLine: { color: '#777777' } },
  grid: { horzLines: { color: '#222222' } },
  layout: {
    background: { color: '#111111' },
    fontSize: 12,
    textColor: '#eeeeee',
  },
  rightPriceScale: { borderColor: '#333333' },
};

const mapped = createCanvasSettingsChartOptions({
  chartAxisBorderColor: '#abcdef',
  chartBackgroundColor: '#010203',
  chartCrosshairColor: '#112233',
  chartGrid: false,
  chartGridColor: '#223344',
  chartBottomMarginPercent: 12,
  chartNavigationVisibility: 'always',
  chartScaleFontSize: 16,
  chartScaleTextColor: '#ddeeff',
  chartTopMarginPercent: 15,
}, defaults);

assert.equal(mapped.options.layout.background.color, '#010203');
assert.equal(mapped.options.layout.fontSize, 16);
assert.equal(mapped.options.layout.textColor, '#ddeeff');
assert.equal(mapped.options.grid.horzLines.color, 'rgba(0, 0, 0, 0)');
assert.equal(mapped.options.grid.vertLines.color, 'rgba(0, 0, 0, 0)');
assert.equal(mapped.options.crosshair.horzLine.color, '#112233');
assert.equal(mapped.options.crosshair.vertLine.color, '#112233');
assert.equal(mapped.options.rightPriceScale.borderColor, '#abcdef');
assert.deepEqual(mapped.options.rightPriceScale.scaleMargins, { bottom: 0.12, top: 0.15 });
assert.equal(mapped.options.timeScale.borderColor, '#abcdef');
assert.equal(mapped.state.chartGridColor, '#223344');
assert.equal(mapped.state.chartNavigationVisibility, 'always');

console.log('V6 Canvas Settings options Step 410 smoke passed.');
