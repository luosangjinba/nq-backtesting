// Manual 1H market segment creation workflow.

import * as bus from '../event-bus.js';
import * as store from '../data/bar-store.js';
import { getPrimaryChartContext } from '../chart/chart-context.js';
import { getBarChartTime as getProjectedBarChartTime } from '../chart/time-projection.js';
import { timeframeToString } from '../config.js';
import { fetchBars } from '../api.js';
import { addSegment, clearSegments } from './segment-store.js';

const SEGMENT_TIMEFRAME = 60;
const OCCURRENCE_SOURCE_TIMEFRAME = 1;
const PRICE_EPSILON = 0.0000001;

let segmentSelectionState = null;

function getContextTimeframe(context) {
  return Number(context?.timeframe) || store.getCurrentTimeframe();
}

function getBarChartTime(context, bar) {
  return getProjectedBarChartTime(bar, getContextTimeframe(context));
}

function normalizeSwingKind(kind) {
  return kind === 'swing-high' ? 'swing-high' : 'swing-low';
}

function getSwingKindLabel(kind) {
  return normalizeSwingKind(kind) === 'swing-high' ? 'High' : 'Low';
}

function getPointPrice(bar, kind) {
  if (!bar) return null;
  return normalizeSwingKind(kind) === 'swing-low' ? bar.low : bar.high;
}

function getDirection(startPrice, endPrice) {
  if (endPrice > startPrice) return 'up';
  if (endPrice < startPrice) return 'down';
  return 'flat';
}

function formatTimestampInput(timestamp) {
  const date = new Date(Number(timestamp) * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

function getOccurrenceBar(bars, price, kind, startTimestamp, endTimestamp) {
  const field = normalizeSwingKind(kind) === 'swing-high' ? 'high' : 'low';
  return [...bars]
    .filter((bar) => {
      const timestamp = Number(bar.timestamp);
      const value = Number(bar[field]);
      return (
        Number.isFinite(timestamp) &&
        timestamp >= startTimestamp &&
        timestamp < endTimestamp &&
        Number.isFinite(value) &&
        Math.abs(value - Number(price)) < PRICE_EPSILON
      );
    })
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
    .at(-1);
}

function getSourceContextLabel(context) {
  const chartId = context?.chartId || context?.id || 'primary';
  if (chartId === 'primary') return null;
  return `${context?.instrument || 'NQ'} ${timeframeToString(getContextTimeframe(context))}`;
}

function buildSourceMetadata(context) {
  const sourceTimeframe = getContextTimeframe(context);
  return {
    sourceChartId: context?.chartId || context?.id || 'primary',
    sourceChartLabel: context?.label || '',
    sourceInstrument: context?.instrument || 'NQ',
    sourceTimeframe,
    sourceTimeframeLabel: timeframeToString(sourceTimeframe),
    sourceContext: getSourceContextLabel(context) || '',
  };
}

async function resolveEndpointOccurrence(bar, kind, price, context) {
  const timeframe = getContextTimeframe(context);
  const instrument = context?.instrument || 'NQ';
  if (timeframe !== SEGMENT_TIMEFRAME || instrument !== 'NQ') return {};

  const startTimestamp = Number(bar?.timestamp);
  if (!Number.isFinite(startTimestamp)) return {};
  const endTimestamp = startTimestamp + SEGMENT_TIMEFRAME * 60;

  try {
    const result = await fetchBars(
      formatTimestampInput(startTimestamp),
      formatTimestampInput(endTimestamp),
      OCCURRENCE_SOURCE_TIMEFRAME,
      'NQ'
    );
    const occurrenceBar = getOccurrenceBar(
      Array.isArray(result.bars) ? result.bars : [],
      price,
      kind,
      startTimestamp,
      endTimestamp
    );
    if (!occurrenceBar) return {};
    return {
      occurrenceTime: occurrenceBar.time ?? occurrenceBar.timestamp,
      occurrenceTimestamp: occurrenceBar.timestamp,
      occurrenceSourceTimeframe: OCCURRENCE_SOURCE_TIMEFRAME,
    };
  } catch (err) {
    console.warn('[manual-segment] occurrence lookup failed', err);
    return {};
  }
}

function ensureSegmentContext(context, { requireOneHour = false } = {}) {
  const timeframe = getContextTimeframe(context);
  if (!requireOneHour) return true;
  if (timeframe === SEGMENT_TIMEFRAME) return true;
  bus.emit('status:update', {
    text: `1H 行情段只能在 1H 图表创建，当前是 ${timeframeToString(timeframe)}`,
    isError: true,
  });
  return false;
}

export function getSegmentSelectionSummary() {
  if (!segmentSelectionState) return null;
  return {
    label: `${timeframeToString(segmentSelectionState.timeframe || SEGMENT_TIMEFRAME)} Segment`,
    startTime: segmentSelectionState.startBar?.tradingDay || segmentSelectionState.startBar?.time,
    startKind: segmentSelectionState.startKind,
    startKindLabel: getSwingKindLabel(segmentSelectionState.startKind),
  };
}

export function startSegmentInContext(bar, startKind = 'swing-low', context = getPrimaryChartContext(), options = {}) {
  if (!bar || !ensureSegmentContext(context, options)) return;

  const normalizedStartKind = normalizeSwingKind(startKind);
  const startPrice = getPointPrice(bar, normalizedStartKind);
  if (!Number.isFinite(Number(startPrice))) {
    bus.emit('status:update', { text: '1H 行情段起点无效：无法读取 High/Low', isError: true });
    return;
  }

  segmentSelectionState = {
    startBar: bar,
    startKind: normalizedStartKind,
    contextMetadata: buildSourceMetadata(context),
    instrument: context?.instrument || 'NQ',
    timeframe: getContextTimeframe(context),
    chartTime: getBarChartTime(context, bar),
  };

  const timeframeLabel = timeframeToString(getContextTimeframe(context));
  bus.emit('status:update', {
    text: `${timeframeLabel} 行情段起点已选择：${bar.tradingDay || bar.time} ${getSwingKindLabel(normalizedStartKind)} ${Number(startPrice).toFixed(2)}，右键选择终点`,
    isError: false,
  });
}

export async function finishSegmentInContext(endBar, endKind = 'swing-high', context = getPrimaryChartContext(), options = {}) {
  if (!segmentSelectionState || !endBar || !ensureSegmentContext(context, options)) return;
  const contextTimeframe = getContextTimeframe(context);
  const selectionTimeframe = Number(segmentSelectionState.timeframe);
  if (Number.isFinite(selectionTimeframe) && selectionTimeframe !== contextTimeframe) {
    bus.emit('status:update', { text: '行情段起点和终点必须来自同一周期', isError: true });
    return;
  }

  const startBar = segmentSelectionState.startBar;
  if (startBar.timestamp === endBar.timestamp) {
    bus.emit('status:update', { text: '行情段起点和终点不能是同一根 K 线', isError: true });
    return;
  }

  const startKind = normalizeSwingKind(segmentSelectionState.startKind);
  const normalizedEndKind = normalizeSwingKind(endKind);
  const startPrice = getPointPrice(startBar, startKind);
  const endPrice = getPointPrice(endBar, normalizedEndKind);
  if (!Number.isFinite(Number(startPrice)) || !Number.isFinite(Number(endPrice))) {
    bus.emit('status:update', { text: '1H 行情段终点无效：无法读取 High/Low', isError: true });
    return;
  }

  const direction = getDirection(startPrice, endPrice);
  const [startOccurrence, endOccurrence] = await Promise.all([
    resolveEndpointOccurrence(startBar, startKind, startPrice, context),
    resolveEndpointOccurrence(endBar, normalizedEndKind, endPrice, context),
  ]);
  const sourceMetadata = segmentSelectionState.contextMetadata || buildSourceMetadata(context);
  const sourceTimeframe = sourceMetadata.sourceTimeframe || contextTimeframe;
  const sourceTimeframeLabel = sourceMetadata.sourceTimeframeLabel || timeframeToString(sourceTimeframe);
  const sourceChartId = sourceMetadata.sourceChartId || 'primary';
  const segment = {
    id: `manual_segment_${sourceChartId}_${sourceTimeframeLabel.toLowerCase()}_${startBar.timestamp}_${endBar.timestamp}_${Date.now()}`,
    instrument: sourceMetadata.sourceInstrument || context?.instrument || 'NQ',
    timeframe: sourceTimeframeLabel,
    source: 'manual',
    ...sourceMetadata,
    direction,
    start: {
      time: segmentSelectionState.chartTime ?? getBarChartTime(context, startBar),
      timestamp: startBar.timestamp,
      price: startPrice,
      kind: startKind,
      barTime: startBar.time,
      sourceTimeframe,
      ...startOccurrence,
    },
    end: {
      time: getBarChartTime(context, endBar),
      timestamp: endBar.timestamp,
      price: endPrice,
      kind: normalizedEndKind,
      barTime: endBar.time,
      sourceTimeframe,
      ...endOccurrence,
    },
    pdaResponses: [],
    narrative: '',
    tags: [],
    display: {
      showLabel: false,
    },
  };

  addSegment(segment);
  segmentSelectionState = null;

  bus.emit('status:update', {
    text: `${sourceTimeframeLabel} ${direction.toUpperCase()} 行情段：${getSwingKindLabel(startKind)} ${Number(startPrice).toFixed(2)} → ${getSwingKindLabel(normalizedEndKind)} ${Number(endPrice).toFixed(2)}`,
    isError: false,
  });
}

export function startSegment(bar, startKind = 'swing-low') {
  return startSegmentInContext(bar, startKind, getPrimaryChartContext(), { requireOneHour: true });
}

export function finishSegment(endBar, endKind = 'swing-high') {
  return finishSegmentInContext(endBar, endKind, getPrimaryChartContext(), { requireOneHour: true });
}

export function cancelSegmentSelection({ silent = false } = {}) {
  if (!segmentSelectionState) return;
  segmentSelectionState = null;
  if (!silent) {
    bus.emit('status:update', { text: '1H 行情段选择已取消', isError: false });
  }
}

export function clearManualSegments() {
  clearSegments();
  cancelSegmentSelection({ silent: true });
  bus.emit('status:update', { text: '1H 行情段已清除', isError: false });
}

export function initManualSegment() {
  bus.on('bars:loaded', () => cancelSegmentSelection({ silent: true }));
  bus.on('bars:cleared', () => cancelSegmentSelection({ silent: true }));
}
