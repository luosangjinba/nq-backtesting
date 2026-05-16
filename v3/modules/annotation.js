/**
 * annotation.js - 图表标注模块
 * 复用 pda-renderer 的 LiquidityPrimitive 和 FvgPrimitive，保持与自动扫描 PDA 一致的样式
 */

import { state } from './chart.js';
import { LiquidityPrimitive, FvgPrimitive } from './pda-renderer.js';

// 标注存储
export const annotations = {
  swingLows: [],
  swingHighs: [],
  fvgs: [],
};

function triggerRedraw() {
  if (state.chart) {
    state.chart.applyOptions({});
  }
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 添加 Swing Low 标注（与 SSL 同款样式）
 */
export function addSwingLow(time, price /* , timeframe */) {
  const primitive = new LiquidityPrimitive(
    state.chart,
    state.candlestickSeries,
    time,
    price,
    '#ffb74d',
    '#ef5350',
    'SL',
    'below'
  );
  state.candlestickSeries.attachPrimitive(primitive);

  const id = makeId('swing_low');
  annotations.swingLows.push({ id, time, price, primitive });
  triggerRedraw();
  return id;
}

/**
 * 添加 Swing High 标注（与 BSL 同款样式）
 */
export function addSwingHigh(time, price /* , timeframe */) {
  const primitive = new LiquidityPrimitive(
    state.chart,
    state.candlestickSeries,
    time,
    price,
    '#5b9cf6',
    '#26a69a',
    'SH',
    'above'
  );
  state.candlestickSeries.attachPrimitive(primitive);

  const id = makeId('swing_high');
  annotations.swingHighs.push({ id, time, price, primitive });
  triggerRedraw();
  return id;
}

/**
 * 添加 FVG 标注（与 PDA FVG 同款样式：bar-aligned 起止时间）
 */
export function addFvgAnnotation(anchorTime, high, low, direction, timeframe) {
  const tfSec = timeframe * 60;
  const startTime = anchorTime - tfSec;
  const endTime = anchorTime + tfSec * 2;
  const color = direction === 'bullish' ? '#26a69a33' : '#ef535033';

  const primitive = new FvgPrimitive(
    state.chart,
    state.candlestickSeries,
    startTime,
    endTime,
    high,
    low,
    color
  );
  state.candlestickSeries.attachPrimitive(primitive);

  const id = makeId('fvg');
  annotations.fvgs.push({ id, anchorTime, high, low, direction, timeframe, primitive });
  triggerRedraw();
  return id;
}

/**
 * 清除所有标注
 */
export function clearAllAnnotations() {
  if (state.candlestickSeries) {
    [...annotations.swingLows, ...annotations.swingHighs, ...annotations.fvgs].forEach((a) => {
      state.candlestickSeries.detachPrimitive(a.primitive);
    });
  }

  annotations.swingLows = [];
  annotations.swingHighs = [];
  annotations.fvgs = [];

  triggerRedraw();
}
