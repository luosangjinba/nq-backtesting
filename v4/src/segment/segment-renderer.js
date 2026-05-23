// Draw manual market segments on the chart.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import { SegmentPrimitive } from '../chart/primitives.js';
import { getIsolatedSegment, getSegments } from './segment-store.js';
import { getSelectedSegment } from './segment-selection.js';
import { getIsolateCompanionSegments } from './segment-isolate-view.js';

let renderedPrimitives = [];
const SELECTED_COLOR = '#f0f3fa';

function clearRenderedPrimitives() {
  renderedPrimitives = chart.clearPrimitives(renderedPrimitives);
}

function getSegmentLabel(segment) {
  const direction = segment.direction === 'down' ? 'DOWN' : segment.direction === 'up' ? 'UP' : 'FLAT';
  return `${segment.timeframe || '1H'} ${direction} LEG`;
}

function getIsolateDisplayMode(segment) {
  return segment.display?.isolateDisplayMode || 'highlight';
}

export function renderSegments() {
  clearRenderedPrimitives();

  const chartInstance = chart.getChart();
  const series = chart.getSeries();
  if (!chartInstance || !series) return;

  const selected = getSelectedSegment();
  const isolatedSegment = getIsolatedSegment();
  const isolateCompanionIds = new Set(getIsolateCompanionSegments(isolatedSegment).map((segment) => segment.id));
  getSegments().forEach((segment) => {
    if (!segment.start || !segment.end) return;
    const isIsolated = isolatedSegment?.id === segment.id;
    const isIsolateCompanion = isolateCompanionIds.has(segment.id);
    const isolateMode = isIsolated ? getIsolateDisplayMode(segment) : null;
    if (isolateMode === 'hidden') return;
    const isCurrent = isIsolated ? isolateMode === 'highlight' : selected?.id === segment.id;
    if (isolatedSegment && !isIsolated && !isIsolateCompanion) return;
    const primitive = new SegmentPrimitive(
      chartInstance,
      series,
      segment.start.time,
      segment.start.price,
      segment.end.time,
      segment.end.price,
      getSegmentLabel(segment),
      {
        lineColor: isCurrent ? SELECTED_COLOR : segment.direction === 'down' ? '#ef5350' : '#26a69a',
        textColor: '#f0f3fa',
        markerColor: isCurrent ? SELECTED_COLOR : '#f0f3fa',
        lineWidth: isCurrent ? 3 : 2,
        markerSize: isCurrent ? 5 : 4,
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
  bus.on('segment:selected', renderSegments);
  bus.on('segment:selection-cleared', renderSegments);
  bus.on('bars:loaded', renderSegments);
  bus.on('bars:cleared', clearRenderedPrimitives);
}
