// Draw session PDA annotations on the chart.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import { LiquidityPrimitive, RangePrimitive } from '../chart/primitives.js';
import { getAnnotations } from './pda-store.js';
import { formatPrimaryContextLabel } from './pda-context.js';
import { getPdaType } from './pda-types.js';

let renderedPrimitives = [];

function clearRenderedPrimitives() {
  renderedPrimitives = chart.clearPrimitives(renderedPrimitives);
}

function buildLiquidityPrimitive(annotation, pdaType) {
  const contextLabel = formatPrimaryContextLabel(annotation.contexts);
  const label = contextLabel ? `${pdaType.label} · ${contextLabel}` : pdaType.label;

  return new LiquidityPrimitive(
    chart.getChart(),
    chart.getSeries(),
    annotation.anchorTime,
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
  const startTime = annotation.startTime ?? annotation.anchorTime;
  const endTime = annotation.endTime ?? annotation.anchorTime;

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
    }
  });
}

export function initPdaRenderer() {
  bus.on('pda:changed', renderPdaAnnotations);
  bus.on('bars:loaded', renderPdaAnnotations);
  bus.on('bars:cleared', clearRenderedPrimitives);
}
