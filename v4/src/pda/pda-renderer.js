// Draw session PDA annotations on the chart.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as store from '../data/bar-store.js';
import { LiquidityPrimitive, PointSetPrimitive, RangePrimitive } from '../chart/primitives.js';
import { getAnnotations } from './pda-store.js';
import { formatPrimaryContextLabel, getBucketStart } from './pda-context.js';
import { getPdaType } from './pda-types.js';

let renderedPrimitives = [];

function clearRenderedPrimitives() {
  renderedPrimitives = chart.clearPrimitives(renderedPrimitives);
}

function mapTimestampToCurrentChartTime(timestamp) {
  if (timestamp === undefined || timestamp === null) return null;
  if (!Number.isFinite(Number(timestamp))) return null;
  const timeframe = store.getCurrentTimeframe();
  const bucketStart = getBucketStart(Number(timestamp), timeframe);
  if (timeframe === 1440) {
    const date = new Date((bucketStart + 24 * 60 * 60) * 1000);
    return date.toISOString().slice(0, 10);
  }
  return bucketStart;
}

function getPointRenderTime(annotation) {
  return (
    mapTimestampToCurrentChartTime(annotation.canonicalTimestamp) ??
    mapTimestampToCurrentChartTime(annotation.timestamp) ??
    annotation.anchorTime
  );
}

function getRangeRenderTime(annotation, field, fallbackField) {
  const timestamp = annotation[`${field}Timestamp`] ?? annotation[field];
  return mapTimestampToCurrentChartTime(timestamp) ?? annotation[fallbackField] ?? annotation.anchorTime;
}

function buildLiquidityPrimitive(annotation, pdaType) {
  const contextLabel = formatPrimaryContextLabel(annotation.contexts);
  const label = contextLabel ? `${pdaType.label} · ${contextLabel}` : pdaType.label;
  const anchorTime = getPointRenderTime(annotation);
  if (anchorTime === undefined || anchorTime === null) return null;

  return new LiquidityPrimitive(
    chart.getChart(),
    chart.getSeries(),
    anchorTime,
    annotation.price,
    pdaType.color,
    pdaType.textColor,
    label,
    pdaType.labelPosition,
    {
      lineLength: 8,
      lineWidth: 2,
      labelFont: '11px sans-serif',
    }
  );
}

function alphaColor(hexColor, alphaHex = '33') {
  return hexColor?.startsWith('#') && hexColor.length === 7 ? `${hexColor}${alphaHex}` : hexColor;
}

function buildRangePrimitive(annotation, pdaType) {
  const contextLabel = formatPrimaryContextLabel(annotation.contexts);
  const label = contextLabel ? `${pdaType.label} · ${contextLabel}` : pdaType.label;
  const topPrice = annotation.topPrice ?? annotation.priceHigh;
  const bottomPrice = annotation.bottomPrice ?? annotation.priceLow;
  const startTime = getRangeRenderTime(annotation, 'startTime', 'startTime');
  const endTime = getRangeRenderTime(annotation, 'endTime', 'endTime');

  if (
    startTime === undefined ||
    endTime === undefined ||
    topPrice === undefined ||
    bottomPrice === undefined
  ) {
    return null;
  }

  return new RangePrimitive(
    chart.getChart(),
    chart.getSeries(),
    startTime,
    endTime,
    topPrice,
    bottomPrice,
    label,
    {
      fillColor: annotation.fillColor || alphaColor(pdaType.color, '33'),
      borderColor: annotation.borderColor || pdaType.color,
      textColor: annotation.textColor || pdaType.textColor || '#d1d4dc',
      labelFont: '11px sans-serif',
    }
  );
}

function buildPointSetPrimitive(annotation, pdaType) {
  const points = Array.isArray(annotation.points)
    ? annotation.points
        .map((point) => ({
          time:
            mapTimestampToCurrentChartTime(point.canonicalTimestamp) ??
            mapTimestampToCurrentChartTime(point.timestamp) ??
            point.anchorTime,
          price: point.price,
        }))
        .filter((point) => point.time !== undefined && point.time !== null && point.price !== undefined)
    : [];
  if (points.length < 2) return null;

  const contextLabel = formatPrimaryContextLabel(annotation.contexts);
  const label = contextLabel ? `${pdaType.label} · ${contextLabel}` : pdaType.label;
  const referencePrice =
    annotation.referencePrice ??
    annotation.price ??
    points.reduce((sum, point) => sum + Number(point.price), 0) / points.length;

  return new PointSetPrimitive(chart.getChart(), chart.getSeries(), points, referencePrice, label, {
    lineColor: annotation.color || pdaType.color,
    textColor: annotation.textColor || pdaType.textColor || '#d1d4dc',
    markerPosition: annotation.markerPosition || pdaType.labelPosition || 'above',
    labelFont: '11px sans-serif',
  });
}

export function renderPdaAnnotations() {
  clearRenderedPrimitives();

  const chartInstance = chart.getChart();
  const series = chart.getSeries();
  if (!chartInstance || !series) return;

  getAnnotations().forEach((annotation) => {
    const pdaType = getPdaType(annotation.type);
    if (!pdaType) return;

    if (pdaType.shape === 'liquidity-line') {
      const primitive = buildLiquidityPrimitive(annotation, pdaType);
      if (!primitive) return;
      chart.attachPrimitive(primitive);
      primitive.requestUpdate();
      renderedPrimitives.push(primitive);
      return;
    }

    if (pdaType.shape === 'range') {
      const primitive = buildRangePrimitive(annotation, pdaType);
      if (!primitive) return;
      chart.attachPrimitive(primitive);
      primitive.requestUpdate();
      renderedPrimitives.push(primitive);
      return;
    }

    if (pdaType.shape === 'point-set') {
      const primitive = buildPointSetPrimitive(annotation, pdaType);
      if (!primitive) return;
      chart.attachPrimitive(primitive);
      primitive.requestUpdate();
      renderedPrimitives.push(primitive);
    }
  });
}

export function initPdaRenderer() {
  bus.on('pda:changed', renderPdaAnnotations);
  bus.on('bars:loaded', renderPdaAnnotations);
  bus.on('bars:cleared', clearRenderedPrimitives);
}
