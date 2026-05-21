// Draw session PDA annotations on the chart.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as store from '../data/bar-store.js';
import { LiquidityPrimitive, PointSetPrimitive, RangePrimitive } from '../chart/primitives.js';
import { getAnnotations } from './pda-store.js';
import { formatPrimaryContextLabel, getBucketStart } from './pda-context.js';
import { getPdaDisplaySettings } from './pda-display-settings.js';
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

function getShowCe(annotation) {
  return annotation.display?.showCe ?? annotation.showCe ?? true;
}

function isCurrentAnnotation(annotation, selection) {
  return Boolean(selection?.id && annotation?.id && String(selection.id) === String(annotation.id));
}

function shouldShowLabel(isCurrent = false, displaySettings = {}) {
  if (isCurrent) return displaySettings.showCurrentLabel !== false;
  return displaySettings.showLabels !== false;
}

function buildLiquidityPrimitive(annotation, pdaType, isCurrent = false, displaySettings = {}) {
  const label = getAnnotationLabel(annotation, pdaType, isCurrent);
  const anchorTime = getPointRenderTime(annotation);
  if (anchorTime === undefined || anchorTime === null) return null;

  return new LiquidityPrimitive(
    chart.getChart(),
    chart.getSeries(),
    anchorTime,
    annotation.price,
    isCurrent ? SELECTED_COLOR : pdaType.color,
    isCurrent ? SELECTED_COLOR : pdaType.textColor,
    label,
    pdaType.labelPosition,
    {
      lineLength: getExtendBars(annotation, DEFAULT_EXTEND_BARS),
      lineWidth: isCurrent ? 3 : 2,
      labelFont: isCurrent ? '12px sans-serif' : '11px sans-serif',
      showLabel: shouldShowLabel(isCurrent, displaySettings),
    }
  );
}

function alphaColor(hexColor, alphaHex = '33') {
  return hexColor?.startsWith('#') && hexColor.length === 7 ? `${hexColor}${alphaHex}` : hexColor;
}

function isVisibleColor(color) {
  return color && color !== 'transparent';
}

function getRangeMidlineColor(annotation, pdaType, isCurrent = false, isFvg = false) {
  if (isCurrent) return SELECTED_COLOR;
  if (isVisibleColor(annotation.midlineColor)) return annotation.midlineColor;
  if (isVisibleColor(annotation.borderColor)) return annotation.borderColor;
  if (isFvg && annotation.direction === 'bullish') return '#26a69a';
  if (isFvg && annotation.direction === 'bearish') return '#ef5350';
  return pdaType.color;
}

function buildRangePrimitive(annotation, pdaType, isCurrent = false, displaySettings = {}) {
  const label = getAnnotationLabel(annotation, pdaType, isCurrent);
  const isFvg = annotation.type === 'fvg';
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
      borderColor: isFvg ? 'transparent' : isCurrent ? SELECTED_COLOR : annotation.borderColor || pdaType.color,
      midlineColor: getRangeMidlineColor(annotation, pdaType, isCurrent, isFvg),
      textColor: isCurrent ? SELECTED_COLOR : annotation.textColor || pdaType.textColor || '#d1d4dc',
      lineWidth: isFvg ? 0 : isCurrent ? 2 : 1,
      showMidline: getShowCe(annotation),
      extendBars: getExtendBars(annotation, 0),
      labelFont: isCurrent ? '12px sans-serif' : '11px sans-serif',
      showLabel: shouldShowLabel(isCurrent, displaySettings),
    }
  );
}

function buildPointSetPrimitive(annotation, pdaType, isCurrent = false, displaySettings = {}) {
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

  const label = getAnnotationLabel(annotation, pdaType, isCurrent);
  const referencePrice =
    annotation.referencePrice ??
    annotation.price ??
    points.reduce((sum, point) => sum + Number(point.price), 0) / points.length;

  return new PointSetPrimitive(chart.getChart(), chart.getSeries(), points, referencePrice, label, {
    lineColor: isCurrent ? SELECTED_COLOR : annotation.color || pdaType.color,
    textColor: isCurrent ? SELECTED_COLOR : annotation.textColor || pdaType.textColor || '#d1d4dc',
    markerPosition: annotation.markerPosition || pdaType.labelPosition || 'above',
    lineWidth: isCurrent ? 2 : 1,
    markerSize: isCurrent ? 5 : 4,
    extendBars: getExtendBars(annotation, 0),
    labelFont: isCurrent ? '12px sans-serif' : '11px sans-serif',
    showLabel: shouldShowLabel(isCurrent, displaySettings),
  });
}

export function renderPdaAnnotations() {
  clearRenderedPrimitives();

  const chartInstance = chart.getChart();
  const series = chart.getSeries();
  if (!chartInstance || !series) return;

  const selected = getSelectedPda();
  const displaySettings = getPdaDisplaySettings();
  getAnnotations().forEach((annotation) => {
    const pdaType = getPdaType(annotation.type);
    if (!pdaType) return;
    const isCurrent = isCurrentAnnotation(annotation, selected);

    if (pdaType.shape === 'liquidity-line') {
      const primitive = buildLiquidityPrimitive(annotation, pdaType, isCurrent, displaySettings);
      if (!primitive) return;
      chart.attachPrimitive(primitive);
      primitive.requestUpdate();
      renderedPrimitives.push(primitive);
      return;
    }

    if (pdaType.shape === 'range') {
      const primitive = buildRangePrimitive(annotation, pdaType, isCurrent, displaySettings);
      if (!primitive) return;
      chart.attachPrimitive(primitive);
      primitive.requestUpdate();
      renderedPrimitives.push(primitive);
      return;
    }

    if (pdaType.shape === 'point-set') {
      const primitive = buildPointSetPrimitive(annotation, pdaType, isCurrent, displaySettings);
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
  bus.on('pda:display-settings-changed', renderPdaAnnotations);
  bus.on('bars:loaded', renderPdaAnnotations);
  bus.on('bars:cleared', clearRenderedPrimitives);
}
