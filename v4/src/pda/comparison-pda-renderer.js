// PDA overlay renderer for the floating Comparison Window.

import * as bus from '../event-bus.js';
import {
  attachComparisonPrimitive,
  clearComparisonPrimitives,
  getComparisonChart,
  getComparisonSeries,
} from '../chart/comparison-chart-manager.js';
import { mapTimestampToChartTime } from '../chart/time-projection.js';
import { getChartLabelFont } from '../display/display-preferences.js';
import { shouldRenderPda } from '../display/display-mode.js';
import { LiquidityPrimitive, RangePrimitive } from '../chart/primitives.js';
import { buildCePrice } from '../price-utils.js';
import { getComparisonDisplayBars, getComparisonWindowState } from '../comparison/comparison-window-store.js';
import { canProjectPdaToComparison, canRenderObjectOnChartTarget } from '../comparison/comparison-overlay-policy.js';
import { createRafThrottle } from '../utils/raf-throttle.js';
import { getAnnotations } from './pda-store.js';
import { getPdaType, OB_COLORS } from './pda-types.js';
import { getExtendBarsForTimeframe } from './pda-extend.js';
import { formatPdaDisplayLabel } from './pda-source-format.js';
import { getSelectedPda } from './pda-selection.js';

const DEFAULT_EXTEND_BARS = 8;
const HIGHLIGHT_COLOR = '#ffcc80';
let renderedPrimitives = [];

function clearRenderedPrimitives() {
  renderedPrimitives = clearComparisonPrimitives(renderedPrimitives) || [];
}

function isComparisonPda(annotation) {
  return annotation?.sourceChartId === 'comparison-window';
}

function canRenderInComparison(annotation, state) {
  return isComparisonPda(annotation) || canRenderObjectOnChartTarget(annotation, 'comparison-window', state).ok;
}

function mapTimestampToComparisonTime(timestamp, timeframe, displayBars) {
  if (timestamp === undefined || timestamp === null) return null;
  if (!Number.isFinite(Number(timestamp))) return null;
  return mapTimestampToChartTime(Number(timestamp), timeframe, displayBars);
}

function getPointRenderTime(annotation, timeframe, displayBars) {
  return (
    mapTimestampToComparisonTime(annotation.canonicalTimestamp, timeframe, displayBars) ??
    mapTimestampToComparisonTime(annotation.timestamp, timeframe, displayBars) ??
    annotation.anchorTime
  );
}

function getRangeRenderTime(annotation, field, fallbackField, timeframe, displayBars) {
  const timestamp = annotation[`${field}Timestamp`] ?? annotation[field];
  return mapTimestampToComparisonTime(timestamp, timeframe, displayBars) ?? annotation[fallbackField] ?? annotation.anchorTime;
}

function getAnnotationLabel(annotation, pdaType) {
  return annotation.displayLabel || formatPdaDisplayLabel(annotation, pdaType.label);
}

function shouldShowLabel(annotation) {
  return annotation.display?.showLabel ?? annotation.showLabel ?? true;
}

function getShowCe(annotation) {
  return annotation.display?.showCe ?? annotation.showCe ?? true;
}

function getExtendBars(annotation, timeframe, fallback = 0) {
  return getExtendBarsForTimeframe(annotation, fallback, timeframe);
}

function getHighlightColor(isHighlighted, fallback) {
  return isHighlighted ? HIGHLIGHT_COLOR : fallback;
}

function alphaColor(hexColor, alphaHex = '33') {
  return hexColor?.startsWith('#') && hexColor.length === 7 ? `${hexColor}${alphaHex}` : hexColor;
}

function isVisibleColor(color) {
  return color && color !== 'transparent';
}

function getRangeFillColor(annotation, pdaType) {
  if (annotation.type === 'ob') return OB_COLORS.fillColor;
  if (annotation.type === 'ifvg') return '#b39ddb33';
  if (annotation.type === 'fvg' && annotation.direction === 'bullish') return '#fdd83533';
  return annotation.fillColor || alphaColor(pdaType.color, '26');
}

function getRangeBorderColor(annotation, pdaType, isHighlighted = false) {
  const isFvg = annotation.type === 'fvg' || annotation.type === 'ifvg';
  if (isHighlighted) return HIGHLIGHT_COLOR;
  if (isFvg) return 'transparent';
  return annotation.borderColor || pdaType.color;
}

function getRangeMidlineColor(annotation, pdaType, isHighlighted = false) {
  if (isHighlighted) return HIGHLIGHT_COLOR;
  if (annotation.type === 'ob') return OB_COLORS.color;
  if (annotation.type === 'ifvg') return '#b39ddb';
  if (annotation.type === 'fvg' && annotation.direction === 'bullish') return '#fdd835';
  if (isVisibleColor(annotation.midlineColor)) return annotation.midlineColor;
  if (isVisibleColor(annotation.borderColor)) return annotation.borderColor;
  if (annotation.type === 'fvg' && annotation.direction === 'bearish') return '#ef5350';
  return pdaType.color;
}

function getRangeTextColor(annotation, pdaType) {
  if (annotation.type === 'ob') return OB_COLORS.textColor;
  if (annotation.type === 'ifvg') return '#ede7f6';
  if (annotation.type === 'fvg' && annotation.direction === 'bullish') return '#fff9c4';
  return annotation.textColor || pdaType.textColor || '#d1d4dc';
}

function buildLiquidityDescriptor(chartInstance, series, annotation, pdaType, timeframe, displayBars, isHighlighted) {
  const anchorTime = getPointRenderTime(annotation, timeframe, displayBars);
  if (anchorTime === undefined || anchorTime === null) return null;
  const lineColor = getHighlightColor(isHighlighted, pdaType.color);
  const textColor = getHighlightColor(isHighlighted, pdaType.textColor);
  const label = getAnnotationLabel(annotation, pdaType);
  const options = {
    lineLength: getExtendBars(annotation, timeframe, DEFAULT_EXTEND_BARS),
    lineWidth: annotation.type === 'wick-ce' ? 1 : isHighlighted ? 3 : 2,
    labelFont: getChartLabelFont(isHighlighted ? 12 : 11),
    showLabel: shouldShowLabel(annotation),
  };

  return {
    key: `pda:${annotation.id}:comparison:liquidity`,
    create: () => new LiquidityPrimitive(
      chartInstance,
      series,
      anchorTime,
      annotation.price,
      lineColor,
      textColor,
      label,
      pdaType.labelPosition,
      options
    ),
  };
}

function buildRangeDescriptor(chartInstance, series, annotation, pdaType, timeframe, displayBars, isHighlighted) {
  const topPrice = annotation.topPrice ?? annotation.priceHigh;
  const bottomPrice = annotation.bottomPrice ?? annotation.priceLow;
  const startTime = getRangeRenderTime(annotation, 'startTime', 'startTime', timeframe, displayBars);
  const endTime = getRangeRenderTime(annotation, 'endTime', 'endTime', timeframe, displayBars);
  if (startTime === undefined || startTime === null || endTime === undefined || endTime === null) return null;
  if (topPrice === undefined || bottomPrice === undefined) return null;

  const ce = Number.isFinite(Number(annotation.ce?.price)) ? annotation.ce : buildCePrice(topPrice, bottomPrice);
  const isFvg = annotation.type === 'fvg' || annotation.type === 'ifvg';
  const label = getAnnotationLabel(annotation, pdaType);
  const options = {
    fillColor: getRangeFillColor(annotation, pdaType),
    borderColor: getRangeBorderColor(annotation, pdaType, isHighlighted),
    midlineColor: getRangeMidlineColor(annotation, pdaType, isHighlighted),
    textColor: getHighlightColor(isHighlighted, getRangeTextColor(annotation, pdaType)),
    lineWidth: isFvg && !isHighlighted ? 0 : isHighlighted ? 2 : 1,
    showMidline: getShowCe(annotation),
    midlinePrice: ce?.price ?? null,
    extendBars: getExtendBars(annotation, timeframe, 0),
    labelFont: getChartLabelFont(isHighlighted ? 12 : 11),
    showLabel: shouldShowLabel(annotation),
  };

  return {
    key: `pda:${annotation.id}:comparison:range`,
    create: () => new RangePrimitive(chartInstance, series, startTime, endTime, topPrice, bottomPrice, label, options),
  };
}

export function renderComparisonPdaAnnotations() {
  const state = getComparisonWindowState();
  if (!state.enabled) {
    clearRenderedPrimitives();
    return;
  }

  const chartInstance = getComparisonChart();
  const series = getComparisonSeries();
  const displayBars = getComparisonDisplayBars();
  if (!chartInstance || !series || !displayBars.length) {
    clearRenderedPrimitives();
    return;
  }

  const selected = getSelectedPda();
  const descriptor = state.descriptor;
  const timeframe = descriptor.timeframe;
  const descriptors = [];
  getAnnotations().forEach((annotation) => {
    if (!canRenderInComparison(annotation, state)) return;
    if (annotation.display?.hidden) return;
    if (!shouldRenderPda(annotation)) return;
    if (!canProjectPdaToComparison(annotation, descriptor).ok) return;

    const pdaType = getPdaType(annotation.type);
    if (!pdaType) return;
    const isHighlighted = selected?.id === annotation.id;
    if (pdaType.shape === 'liquidity-line') {
      const item = buildLiquidityDescriptor(chartInstance, series, annotation, pdaType, timeframe, displayBars, isHighlighted);
      if (item) descriptors.push(item);
    } else if (pdaType.shape === 'range') {
      const item = buildRangeDescriptor(chartInstance, series, annotation, pdaType, timeframe, displayBars, isHighlighted);
      if (item) descriptors.push(item);
    }
  });

  clearRenderedPrimitives();
  renderedPrimitives = descriptors.map((descriptor) => descriptor.create());
  renderedPrimitives.forEach((primitive) => attachComparisonPrimitive(primitive));
}

const renderComparisonPdaAnnotationsOnSelection = createRafThrottle(renderComparisonPdaAnnotations);

export function initComparisonPdaRenderer() {
  bus.on('pda:changed', renderComparisonPdaAnnotations);
  bus.on('pda:selected', renderComparisonPdaAnnotationsOnSelection);
  bus.on('pda:selection-cleared', renderComparisonPdaAnnotationsOnSelection);
  bus.on('display-mode:changed', renderComparisonPdaAnnotations);
  bus.on('display-preferences:changed', renderComparisonPdaAnnotations);
  bus.on('comparison-bars:loaded', renderComparisonPdaAnnotations);
  bus.on('comparison-window:changed', renderComparisonPdaAnnotations);
  bus.on('comparison-bars:cleared', clearRenderedPrimitives);
}
