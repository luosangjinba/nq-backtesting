// Draw manual market segments on the chart.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import { SegmentPrimitive } from '../chart/primitives.js';
import { getSegments } from './segment-store.js';

let renderedPrimitives = [];

function clearRenderedPrimitives() {
  renderedPrimitives = chart.clearPrimitives(renderedPrimitives);
}

function getSegmentLabel(segment) {
  const direction = segment.direction === 'down' ? 'DOWN' : segment.direction === 'up' ? 'UP' : 'FLAT';
  return `${segment.timeframe || '1H'} ${direction} LEG`;
}

export function renderSegments() {
  clearRenderedPrimitives();

  const chartInstance = chart.getChart();
  const series = chart.getSeries();
  if (!chartInstance || !series) return;

  getSegments().forEach((segment) => {
    if (!segment.start || !segment.end) return;
    const primitive = new SegmentPrimitive(
      chartInstance,
      series,
      segment.start.time,
      segment.start.price,
      segment.end.time,
      segment.end.price,
      getSegmentLabel(segment),
      {
        lineColor: segment.direction === 'down' ? '#ef5350' : '#26a69a',
        textColor: '#f0f3fa',
        markerColor: '#f0f3fa',
        showLabel: segment.display?.showLabel ?? true,
      }
    );
    chart.attachPrimitive(primitive);
    primitive.requestUpdate();
    renderedPrimitives.push(primitive);
  });
}

export function initSegmentRenderer() {
  bus.on('segment:changed', renderSegments);
  bus.on('bars:loaded', renderSegments);
  bus.on('bars:cleared', clearRenderedPrimitives);
}
