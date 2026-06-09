// Context-aware PDA creation actions. Callers pass a chart context; existing UI
// still uses the primary context until secondary write flows opt in.

import * as bus from '../event-bus.js';
import {
  findDisplayBarByTime,
  getBarChartTime as getProjectedBarChartTime,
} from '../chart/time-projection.js';
import { timeframeToString } from '../config.js';
import { buildCePrice } from '../price-utils.js';
import { recordHistory } from '../history/history-manager.js';
import { addAnnotation } from './pda-store.js';
import { buildPointContexts, formatContextLabel, getPointCanonicalTimestamp } from './pda-context.js';
import { fetchTradingDaySourceBars } from './pda-context-data.js';
import { buildExtendDisplayPatch } from './pda-extend.js';
import { identifyFvg } from './fvg-identifier.js';
import { validateManualSwing } from './pda-swing-validator.js';
import { getPdaType, OB_COLORS } from './pda-types.js';
import { getDefaultFibLevels } from './fib-levels.js';

const DEFAULT_LIQUIDITY_EXTEND_BARS = 8;

function getDisplayBars(context) {
  const bars = context?.getDisplayBars?.();
  return Array.isArray(bars) ? bars : [];
}

export function getBarChartTime(context, bar) {
  return getProjectedBarChartTime(bar, context?.timeframe);
}

export function findDisplayBarInContext(context, time) {
  if (time === undefined || time === null) return null;
  return findDisplayBarByTime(getDisplayBars(context), time, context?.timeframe);
}

export function getSelectedRangeBars(context, startBar, endBar) {
  const displayBars = getDisplayBars(context);
  const startIndex = displayBars.findIndex((candidate) => candidate.timestamp === startBar?.timestamp);
  const endIndex = displayBars.findIndex((candidate) => candidate.timestamp === endBar?.timestamp);

  if (startIndex < 0 || endIndex < 0) return [];

  const from = Math.min(startIndex, endIndex);
  const to = Math.max(startIndex, endIndex);
  return displayBars.slice(from, to + 1);
}

function buildSourceMetadata(context, extraMetadata = {}) {
  const chartId = context?.chartId || context?.id || 'primary';
  const sourceTimeframe = context?.timeframe;
  const sourceContext = buildSourceContextLabel(context);
  return {
    sourceChartId: chartId,
    sourceChartLabel: context?.label || (chartId === 'secondary' ? 'Secondary' : 'Primary'),
    sourceInstrument: context?.instrument || 'NQ',
    sourceTimeframe,
    sourceTimeframeLabel: timeframeToString(sourceTimeframe),
    ...(sourceContext ? { sourceContext } : {}),
    ...extraMetadata,
  };
}

function buildSourceContextLabel(context) {
  const chartId = context?.chartId || context?.id || 'primary';
  if (chartId === 'primary') return null;
  return `${context?.instrument || 'NQ'} ${timeframeToString(context?.timeframe)}`;
}

function buildDefaultDisplay(context, metadata = {}) {
  if (metadata.display) return metadata.display;
  const chartId = context?.chartId || context?.id || 'primary';
  if (chartId !== 'secondary') return undefined;
  return buildExtendDisplayPatch(DEFAULT_LIQUIDITY_EXTEND_BARS, context?.timeframe);
}

export async function addManualPoint(type, bar, context, metadata = {}) {
  const pdaType = getPdaType(type);
  if (!pdaType || !bar || !context) return false;

  const timeframe = context.timeframe;
  let contextBars = getDisplayBars(context);
  try {
    contextBars = await fetchTradingDaySourceBars(bar.timestamp);
  } catch (err) {
    bus.emit('status:update', {
      text: `PDA 1M context source 加载失败，暂用当前显示区间: ${err.message}`,
      isError: true,
    });
  }

  const displayBars = getDisplayBars(context);
  const sourceContextLabel = buildSourceContextLabel(context);
  const contexts = [
    sourceContextLabel,
    ...buildPointContexts(type, bar, timeframe, contextBars),
  ].filter(Boolean);
  const price = bar[pdaType.priceField];
  const canonicalTimestamp = getPointCanonicalTimestamp(type, bar, timeframe, contextBars);
  const validation = validateManualSwing(type, bar, timeframe, displayBars);
  const display = buildDefaultDisplay(context, metadata);
  const annotation = {
    id: `manual_${type}_${canonicalTimestamp}_${Date.now()}`,
    type,
    source: 'manual',
    anchorTime: getBarChartTime(context, bar),
    canonicalTimestamp,
    timestamp: bar.timestamp,
    barTime: bar.time,
    price,
    ...buildSourceMetadata(context, metadata),
    ...(display ? { display } : {}),
    contexts,
    validation,
  };

  await recordHistory(`Mark ${pdaType.label}`, () => addAnnotation(annotation));

  const contextLabel = formatContextLabel(contexts);
  const validationPrefix =
    validation.checked && !validation.valid ? `Warning: ${validation.message}; marked anyway. ` : '';
  bus.emit('status:update', {
    text: `${validationPrefix}${pdaType.label}: ${price.toFixed(2)} ${bar.tradingDay || bar.time}${
      contextLabel ? ` · ${contextLabel}` : ''
    }`,
    isError: validation.checked && !validation.valid,
  });
  return true;
}

export async function addManualObLastBar(bar, context, price) {
  const pdaType = getPdaType('ob-last-bar');
  const numericPrice = Number(price);
  if (!pdaType || !bar || !context || !Number.isFinite(numericPrice)) {
    bus.emit('status:update', { text: 'OB Last Bar 创建失败：没有有效 K 线或价格', isError: true });
    return false;
  }

  const timeframe = context.timeframe;
  const tfLabel = timeframeToString(timeframe);
  const instrument = context.instrument || 'NQ';
  const annotation = {
    id: `manual_ob_last_bar_${context.timeframe}_${bar.timestamp}_${Date.now()}`,
    type: 'ob-last-bar',
    source: 'manual',
    anchorTime: getBarChartTime(context, bar),
    canonicalTimestamp: bar.timestamp,
    timestamp: bar.timestamp,
    barTime: bar.time,
    price: numericPrice,
    ...buildSourceMetadata(context),
    displayLabel: `${pdaType.label} · ${instrument} ${tfLabel}`,
    contexts: [`${tfLabel} ${pdaType.label}`],
  };

  await recordHistory(`Mark ${pdaType.label}`, () => addAnnotation(annotation));

  bus.emit('status:update', {
    text: `${pdaType.label}: ${numericPrice.toFixed(2)} ${bar.tradingDay || bar.time}`,
    isError: false,
  });
  return true;
}

function getFvgColors(direction) {
  return direction === 'bullish'
    ? { fillColor: '#fdd83533', borderColor: 'transparent', midlineColor: '#fdd835', textColor: '#fff9c4' }
    : { fillColor: '#ef535033', borderColor: 'transparent', midlineColor: '#ef5350', textColor: '#ffcdd2' };
}

function getIfvgColors() {
  return {
    fillColor: '#fdd83533',
    borderColor: 'transparent',
    midlineColor: '#fdd835',
    textColor: '#fff9c4',
  };
}

function invertDirection(direction) {
  if (direction === 'bullish') return 'bearish';
  if (direction === 'bearish') return 'bullish';
  return direction;
}

export function addManualFvg(bar, context, type = 'fvg') {
  const pdaType = getPdaType(type);
  if (!pdaType || !bar || !context) return false;

  const result = identifyFvg(getDisplayBars(context), bar);
  if (!result) {
    bus.emit('status:update', { text: `未识别到 ${pdaType.label} 结构`, isError: true });
    return false;
  }

  const tfLabel = timeframeToString(context.timeframe);
  const direction = type === 'ifvg' ? invertDirection(result.direction) : result.direction;
  const sourceContextLabel = buildSourceContextLabel(context);
  const contexts = [
    sourceContextLabel,
    `${tfLabel} ${pdaType.label}`,
  ].filter(Boolean);
  const colors = type === 'ifvg' ? getIfvgColors() : getFvgColors(direction);
  const annotation = {
    id: `manual_${type}_${result.anchorBar.timestamp}_${Date.now()}`,
    type,
    source: 'manual',
    direction,
    anchorTime: getBarChartTime(context, result.anchorBar),
    canonicalTimestamp: result.anchorBar.timestamp,
    timestamp: result.anchorBar.timestamp,
    barTime: result.anchorBar.time,
    startTime: getBarChartTime(context, result.startBar),
    endTime: getBarChartTime(context, result.endBar),
    topPrice: result.topPrice,
    bottomPrice: result.bottomPrice,
    ce: buildCePrice(result.topPrice, result.bottomPrice),
    ...buildSourceMetadata(context),
    contexts,
    ...colors,
  };

  recordHistory(`Mark ${pdaType.label}`, () => addAnnotation(annotation));

  bus.emit('status:update', {
    text: `${pdaType.label}: ${direction} ${result.bottomPrice.toFixed(2)}-${result.topPrice.toFixed(2)} ${result.anchorBar.tradingDay || result.anchorBar.time}`,
    isError: false,
  });
  return true;
}

function getWickCe(bar, side) {
  if (!bar) return null;
  const open = Number(bar.open);
  const close = Number(bar.close);
  const high = Number(bar.high);
  const low = Number(bar.low);
  if (![open, close, high, low].every(Number.isFinite)) return null;

  const bodyHigh = Math.max(open, close);
  const bodyLow = Math.min(open, close);

  if (side === 'upper') {
    const wickPoints = high - bodyHigh;
    if (wickPoints <= 0) return null;
    return {
      price: (high + bodyHigh) / 2,
      wickSide: 'upper',
      wickPoints,
      bodyHigh,
      bodyLow,
      high,
      low,
    };
  }

  const wickPoints = bodyLow - low;
  if (wickPoints <= 0) return null;
  return {
    price: (low + bodyLow) / 2,
    wickSide: 'lower',
    wickPoints,
    bodyHigh,
    bodyLow,
    high,
    low,
  };
}

export function addManualWickCe(side, bar, context) {
  const pdaType = getPdaType('wick-ce');
  if (!pdaType || !bar || !context) return false;

  const wickCe = getWickCe(bar, side);
  const tfLabel = timeframeToString(context.timeframe);
  const sideLabel = side === 'upper' ? 'Upper' : 'Lower';
  if (!wickCe) {
    bus.emit('status:update', { text: `${tfLabel} ${sideLabel} Wick CE 无有效影线`, isError: true });
    return false;
  }

  const annotation = {
    id: `manual_wick_ce_${side}_${context.timeframe}_${bar.timestamp}_${Date.now()}`,
    type: 'wick-ce',
    source: 'manual',
    timeframe: tfLabel,
    wickSide: wickCe.wickSide,
    anchorTime: getBarChartTime(context, bar),
    canonicalTimestamp: bar.timestamp,
    timestamp: bar.timestamp,
    barTime: bar.time,
    price: wickCe.price,
    wickPoints: wickCe.wickPoints,
    bodyHigh: wickCe.bodyHigh,
    bodyLow: wickCe.bodyLow,
    high: wickCe.high,
    low: wickCe.low,
    ...buildSourceMetadata(context),
    contexts: [`${tfLabel} ${sideLabel} Wick CE`],
  };

  recordHistory(`Mark ${sideLabel} Wick CE`, () => addAnnotation(annotation));

  bus.emit('status:update', {
    text: `${tfLabel} ${sideLabel} Wick CE: ${wickCe.price.toFixed(2)} ${bar.tradingDay || bar.time}`,
    isError: false,
  });
  return true;
}

function getManualRangeColors(type, direction) {
  if (type === 'breaker') {
    return direction === 'bullish'
      ? { fillColor: '#00acc124', borderColor: 'transparent', textColor: '#ffab91' }
      : { fillColor: '#ff704324', borderColor: 'transparent', textColor: '#ffab91' };
  }

  return { fillColor: OB_COLORS.fillColor, borderColor: 'transparent', textColor: OB_COLORS.textColor };
}

export function addManualRange(selectionState, endBar, context) {
  if (!selectionState || !endBar || !context) return false;

  const rangeBars = getSelectedRangeBars(context, selectionState.startBar, endBar);
  const pdaType = getPdaType(selectionState.type);
  if (!rangeBars.length) {
    bus.emit('status:update', { text: `${pdaType?.label || 'Range PDA'} 区间选择失败：未找到 K 线`, isError: true });
    return false;
  }

  const tfLabel = timeframeToString(context.timeframe);
  const type = selectionState.type;
  const direction = selectionState.direction;
  const startBar = rangeBars[0];
  const lastBar = rangeBars[rangeBars.length - 1];
  const topPrice = Math.max(...rangeBars.map((bar) => bar.high));
  const bottomPrice = Math.min(...rangeBars.map((bar) => bar.low));
  const contexts = [`${tfLabel} ${direction} ${pdaType?.label || type}`];
  const annotation = {
    id: `manual_${type}_${startBar.timestamp}_${lastBar.timestamp}_${Date.now()}`,
    type,
    source: 'manual',
    direction,
    anchorTime: getBarChartTime(context, startBar),
    canonicalTimestamp: startBar.timestamp,
    timestamp: startBar.timestamp,
    barTime: startBar.time,
    startTime: getBarChartTime(context, startBar),
    endTime: getBarChartTime(context, lastBar),
    startTimeTimestamp: startBar.timestamp,
    endTimeTimestamp: lastBar.timestamp,
    topPrice,
    bottomPrice,
    priceHigh: topPrice,
    priceLow: bottomPrice,
    ce: buildCePrice(topPrice, bottomPrice),
    ...buildSourceMetadata(context),
    contexts,
    ...getManualRangeColors(type, direction),
  };

  recordHistory(`Mark ${pdaType?.label || type}`, () => addAnnotation(annotation));

  bus.emit('status:update', {
    text: `${pdaType?.label || type}: ${direction} ${bottomPrice.toFixed(2)}-${topPrice.toFixed(2)} (${rangeBars.length}根${tfLabel})`,
    isError: false,
  });
  return true;
}

export function addManualFib(selectionState, endBar, context) {
  if (!selectionState || !endBar || !context) return false;

  const startBar = selectionState.startBar;
  const bullishMove = Math.abs(Number(endBar.high) - Number(startBar.low));
  const bearishMove = Math.abs(Number(startBar.high) - Number(endBar.low));
  const direction = bullishMove >= bearishMove ? 'bullish' : 'bearish';
  const startPrice = direction === 'bullish' ? Number(startBar.low) : Number(startBar.high);
  const endPrice = direction === 'bullish' ? Number(endBar.high) : Number(endBar.low);
  if (!Number.isFinite(startPrice) || !Number.isFinite(endPrice) || startBar.timestamp === endBar.timestamp) {
    bus.emit('status:update', { text: 'Fib 选择失败：起点/终点无效', isError: true });
    return false;
  }

  const tfLabel = timeframeToString(context.timeframe);
  const annotation = {
    id: `manual_fib_${startBar.timestamp}_${endBar.timestamp}_${Date.now()}`,
    type: 'fib',
    source: 'manual',
    direction,
    anchorTime: getBarChartTime(context, startBar),
    canonicalTimestamp: startBar.timestamp,
    timestamp: startBar.timestamp,
    barTime: startBar.time,
    startTime: getBarChartTime(context, startBar),
    endTime: getBarChartTime(context, endBar),
    startTimeTimestamp: startBar.timestamp,
    endTimeTimestamp: endBar.timestamp,
    start: {
      time: getBarChartTime(context, startBar),
      timestamp: startBar.timestamp,
      price: startPrice,
      kind: direction === 'bullish' ? 'low' : 'high',
    },
    end: {
      time: getBarChartTime(context, endBar),
      timestamp: endBar.timestamp,
      price: endPrice,
      kind: direction === 'bullish' ? 'high' : 'low',
    },
    levels: getDefaultFibLevels(),
    display: {
      showLabels: true,
      showTrendLine: false,
      extend: 'none',
    },
    ...buildSourceMetadata(context),
    contexts: [`${tfLabel} ${direction} Fib`],
  };

  recordHistory('Mark Fib', () => addAnnotation(annotation));

  bus.emit('status:update', {
    text: `Fib: ${direction} ${startPrice.toFixed(2)} -> ${endPrice.toFixed(2)}`,
    isError: false,
  });
  return true;
}
