// Draw session PDA annotations on the chart.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as store from '../data/bar-store.js';
import { LiquidityPrimitive, PointSetPrimitive, RangePrimitive } from '../chart/primitives.js';
import { getAnnotations } from './pda-store.js';
import { formatPrimaryContextLabel, getBucketStart } from './pda-context.js';
import { getPdaType } from './pda-types.js';
import { getSelectedPda } from './pda-selection.js';

let renderedPrimitives = [];
const SELECTED_COLOR = '#f0f3fa';
const DEFAULT_EXTEND_BARS = 8;

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

function getAnnotationLabel(annotation, pdaType, selected = false) {
  const contextLabel = formatPrimaryContextLabel(annotation.contexts);
  const baseLabel = contextLabel ? `${pdaType.label} · ${contextLabel}` : pdaType.label;
  return selected ? `● ${baseLabel}` : baseLabel;
}

function getExtendBars(annotation, fallback = 0) {
  const value = annotation.display?.extendBars ?? annotation.extendBars ?? fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function buildLiquidityPrimitive(annotation, pdaType, selected = false) {
  const label = getAnnotationLabel(annotation, pdaType, selected);
  const anchorTime = getPointRenderTime(annotation);
  if (anchorTime === undefined || anchorTime === null) return null;

  return new LiquidityPrimitive(
    chart.getChart(),
    chart.getSeries(),
    anchorTime,
    annotation.price,
    selected ? SELECTED_COLOR : pdaType.color,
    selected ? SELECTED_COLOR : pdaType.textColor,
    label,
    pdaType.labelPosition,
    {
      lineLength: getExtendBars(annotation, DEFAULT_EXTEND_BARS),
      lineWidth: selected ? 3 : 2,
      labelFont: selected ? '12px sans-serif' : '11px sans-serif',
    }
  );
}

function alphaColor(hexColor, alphaHex = '33') {
  return hexColor?.startsWith('#') && hexColor.length === 7 ? `${hexColor}${alphaHex}` : hexColor;
}

function buildRangePrimitive(annotation, pdaType, selected = false) {
  const label = getAnnotationLabel(annotation, pdaType, selected);
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
      borderColor: selected ? SELECTED_COLOR : annotation.borderColor || pdaType.color,
      textColor: selected ? SELECTED_COLOR : annotation.textColor || pdaType.textColor || '#d1d4dc',
      lineWidth: selected ? 2 : 1,
      extendBars: getExtendBars(annotation, 0),
      labelFont: selected ? '12px sans-serif' : '11px sans-serif',
    }
  );
}

function buildPointSetPrimitive(annotation, pdaType, selected = false) {
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
  if (points.length < 1) return null;

  const label = getAnnotationLabel(annotation, pdaType, selected);
  const referencePrice =
    annotation.referencePrice ??
    annotation.price ??
    points.reduce((sum, point) => sum + Number(point.price), 0) / points.length;

  return new PointSetPrimitive(chart.getChart(), chart.getSeries(), points, referencePrice, label, {
    lineColor: selected ? SELECTED_COLOR : annotation.color || pdaType.color,
    textColor: selected ? SELECTED_COLOR : annotation.textColor || pdaType.textColor || '#d1d4dc',
    markerPosition: annotation.markerPosition || pdaType.labelPosition || 'above',
    lineWidth: selected ? 2 : 1,
    markerSize: selected ? 5 : 4,
    extendBars: getExtendBars(annotation, 0),
    labelFont: selected ? '12px sans-serif' : '11px sans-serif',
  });
}

export function renderPdaAnnotations() {
  clearRenderedPrimitives();

  const chartInstance = chart.getChart();
  const series = chart.getSeries();
  if (!chartInstance || !series) return;

  const selected = getSelectedPda();
  getAnnotations().forEach((annotation) => {
    const pdaType = getPdaType(annotation.type);
    if (!pdaType) return;
    const isSelected = selected?.id === annotation.id;

    if (pdaType.shape === 'liquidity-line') {
      const primitive = buildLiquidityPrimitive(annotation, pdaType, isSelected);
      if (!primitive) return;
      chart.attachPrimitive(primitive);
      primitive.requestUpdate();
      renderedPrimitives.push(primitive);
      return;
    }

    if (pdaType.shape === 'range') {
      const primitive = buildRangePrimitive(annotation, pdaType, isSelected);
      if (!primitive) return;
      chart.attachPrimitive(primitive);
      primitive.requestUpdate();
      renderedPrimitives.push(primitive);
      return;
    }

    if (pdaType.shape === 'point-set') {
      const primitive = buildPointSetPrimitive(annotation, pdaType, isSelected);
      if (!primitive) return;
      chart.attachPrimitive(primitive);
      primitive.requestUpdate();
      renderedPrimitives.push(primitive);
    }
  });
}

export function initPdaRenderer() {
  bus.on('pda:changed', renderPdaAnnotations);
  bus.on('pda:selected', renderPdaAnnotations);
  bus.on('pda:selection-cleared', renderPdaAnnotations);
  bus.on('bars:loaded', renderPdaAnnotations);
  bus.on('bars:cleared', clearRenderedPrimitives);
}
