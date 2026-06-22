import * as chart from '../chart/chart-manager.js';
import { getComparisonChartContext, getPrimaryChartContext } from '../chart/chart-context.js';
import { mapTimestampToChartTime } from '../chart/time-projection.js';
import { timeframeToString } from '../config.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import * as store from '../data/bar-store.js';
import * as comparisonStore from '../comparison/comparison-window-store.js';
import { getSmtRecords, SMT_TYPES } from './smt-store.js';

const LINE_TOLERANCE_PX = 7;
const VERTICAL_TOLERANCE_PX = 6;

function getContext(chartId, context) {
  if (context) return context;
  if (chartId === 'comparison-window') return getComparisonChartContext();
  return getPrimaryChartContext();
}

function getContextInstrument(context, chartId) {
  if (context?.instrument) return context.instrument;
  if (chartId === 'comparison-window') return comparisonStore.getComparisonWindowState().descriptor.instrument;
  return getPrimaryInstrument();
}

function getContextTimeframe(context, chartId) {
  const tf = Number(context?.timeframe);
  if (Number.isFinite(tf) && tf > 0) return tf;
  if (chartId === 'comparison-window') return comparisonStore.getComparisonWindowState().descriptor.timeframe;
  return store.getCurrentTimeframe();
}

function getContextDisplayBars(context, chartId) {
  const bars = context?.getDisplayBars?.();
  if (Array.isArray(bars)) return bars;
  if (chartId === 'comparison-window') return comparisonStore.getComparisonDisplayBars();
  return store.getDisplayBars();
}

function isCompareChart(chartId) {
  return chartId === 'comparison-window';
}

function getTimeCoordinate(time, context) {
  if (time === undefined || time === null) return null;
  return context?.timeToCoordinate?.(time) ?? chart.timeToCoordinate(time);
}

function getPriceCoordinate(price, context) {
  if (price === undefined || price === null) return null;
  return context?.priceToCoordinate?.(Number(price)) ?? chart.priceToCoordinate(Number(price));
}

function distanceToLineSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function shouldHitRecord(record, chartId, context) {
  if (record.display?.hidden) return false;
  const instrument = getContextInstrument(context, chartId);
  const timeframe = timeframeToString(getContextTimeframe(context, chartId));
  if (record.primaryInstrument !== getPrimaryInstrument()) return false;
  if (record.timeframe !== timeframe) return false;
  if (isCompareChart(chartId)) {
    return Boolean(context?.enabled ?? true) && record.compareInstrument === instrument;
  }
  return record.primaryInstrument === instrument;
}

function hitLiquidityRecord(record, x, y, chartId, context) {
  const timeframe = getContextTimeframe(context, chartId);
  const bars = getContextDisplayBars(context, chartId);
  const leftTime = mapTimestampToChartTime(record.leftTimestamp, timeframe, bars);
  const rightTime = mapTimestampToChartTime(record.rightTimestamp, timeframe, bars);
  const leftPrice = isCompareChart(chartId) ? record.compareLeftPrice : record.primaryLeftPrice;
  const rightPrice = isCompareChart(chartId) ? record.compareRightPrice : record.primaryRightPrice;
  const x1 = getTimeCoordinate(leftTime, context);
  const y1 = getPriceCoordinate(leftPrice, context);
  const x2 = getTimeCoordinate(rightTime, context);
  const y2 = getPriceCoordinate(rightPrice, context);
  if ([x1, y1, x2, y2].some((value) => value === null || value === undefined)) return null;
  const distance = distanceToLineSegment(x, y, x1, y1, x2, y2);
  if (distance > LINE_TOLERANCE_PX) return null;
  return {
    id: record.id,
    type: 'smt',
    smtType: record.type,
    chartId,
    distance,
    reason: 'smt-liquidity-line',
  };
}

function hitPrimaryFvgRecord(record, x, y, context) {
  const timeframe = getContextTimeframe(context, 'primary');
  const markerTime = mapTimestampToChartTime(record.timestamp, timeframe, getContextDisplayBars(context, 'primary'));
  const markerX = getTimeCoordinate(markerTime, context);
  if (markerX === null || markerX === undefined) return null;
  const distance = Math.abs(x - markerX);
  if (distance > VERTICAL_TOLERANCE_PX) return null;
  return {
    id: record.id,
    type: 'smt',
    smtType: record.type,
    chartId: 'primary',
    distance,
    reason: 'smt-primary-fvg-time',
  };
}

function hitCompareFvgRecord(record, x, y, chartId, context) {
  const timeframe = getContextTimeframe(context, chartId);
  const bars = getContextDisplayBars(context, chartId);
  const startTime = mapTimestampToChartTime(record.fvgStartTimestamp, timeframe, bars);
  const endTime = mapTimestampToChartTime(record.fvgEndTimestamp, timeframe, bars);
  const x1 = getTimeCoordinate(startTime, context);
  const x2 = getTimeCoordinate(endTime, context);
  const yTop = getPriceCoordinate(record.fvgTop, context);
  const yBottom = getPriceCoordinate(record.fvgBottom, context);
  if ([x1, x2, yTop, yBottom].some((value) => value === null || value === undefined)) return null;
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const top = Math.min(yTop, yBottom);
  const bottom = Math.max(yTop, yBottom);
  if (x < left - LINE_TOLERANCE_PX || x > right + LINE_TOLERANCE_PX) return null;
  if (y < top - LINE_TOLERANCE_PX || y > bottom + LINE_TOLERANCE_PX) return null;
  const edgeDistance = Math.min(Math.abs(x - left), Math.abs(x - right), Math.abs(y - top), Math.abs(y - bottom));
  return {
    id: record.id,
    type: 'smt',
    smtType: record.type,
    chartId,
    distance: Math.max(0, edgeDistance),
    reason: 'smt-comparison-fvg-range',
  };
}

export function hitTestSmtRecords({ x, y, context = null, chartId = 'primary' } = {}) {
  const activeContext = getContext(chartId, context);
  const hits = [];
  getSmtRecords().forEach((record) => {
    if (!shouldHitRecord(record, chartId, activeContext)) return;
    if (record.type === SMT_TYPES.LIQUIDITY) {
      const hit = hitLiquidityRecord(record, x, y, chartId, activeContext);
      if (hit) hits.push(hit);
      return;
    }
  const hit = isCompareChart(chartId)
      ? hitCompareFvgRecord(record, x, y, chartId, activeContext)
      : hitPrimaryFvgRecord(record, x, y, activeContext);
    if (hit) hits.push(hit);
  });
  return hits.sort((a, b) => a.distance - b.distance)[0] || null;
}
