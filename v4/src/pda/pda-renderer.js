// Draw session PDA annotations on the chart.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import { LiquidityPrimitive } from '../chart/primitives.js';
import { getAnnotations } from './pda-store.js';
import { formatContextLabel } from './pda-context.js';
import { getPdaType } from './pda-types.js';

let renderedPrimitives = [];

function clearRenderedPrimitives() {
  renderedPrimitives = chart.clearPrimitives(renderedPrimitives);
}

function buildLiquidityPrimitive(annotation, pdaType) {
  const contextLabel = formatContextLabel(annotation.contexts);
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

export function renderPdaAnnotations() {
  clearRenderedPrimitives();

  const chartInstance = chart.getChart();
  const series = chart.getSeries();
  if (!chartInstance || !series) return;

  getAnnotations().forEach((annotation) => {
    const pdaType = getPdaType(annotation.type);
    if (!pdaType || pdaType.shape !== 'liquidity-line') return;

    const primitive = buildLiquidityPrimitive(annotation, pdaType);
    chart.attachPrimitive(primitive);
    primitive.requestUpdate();
    renderedPrimitives.push(primitive);
  });
}

export function initPdaRenderer() {
  bus.on('pda:changed', renderPdaAnnotations);
  bus.on('bars:loaded', renderPdaAnnotations);
  bus.on('bars:cleared', clearRenderedPrimitives);
}
