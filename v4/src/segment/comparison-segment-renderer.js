// Segment overlay renderer for the floating Comparison Window.

import * as bus from '../event-bus.js';
import {
  attachComparisonPrimitive,
  clearComparisonPrimitives,
  getComparisonChart,
  getComparisonSeries,
} from '../chart/comparison-chart-manager.js';
import { SegmentPrimitive } from '../chart/primitives.js';
import { getChartLabelFont } from '../display/display-preferences.js';
import { shouldRenderSegment } from '../display/display-mode.js';
import { canProjectPriceObjectToComparison } from '../comparison/comparison-overlay-policy.js';
import { getComparisonDisplayBars, getComparisonWindowState } from '../comparison/comparison-window-store.js';
import { createRafThrottle } from '../utils/raf-throttle.js';
import { getSegments } from './segment-store.js';
import { getSelectedSegment } from './segment-selection.js';
import { getSegmentPointRenderTime } from './segment-time.js';

const SEGMENT_LINE_STYLE = {
  lineDash: [6, 5],
  lineOpacity: 0.72,
  showMarkers: false,
};
const HIGHLIGHT_COLOR = '#ffcc80';
let renderedPrimitives = [];

function clearRenderedPrimitives() {
  renderedPrimitives = clearComparisonPrimitives(renderedPrimitives) || [];
}

function isComparisonSegment(segment) {
  return segment?.sourceChartId === 'comparison-window';
}

function hasRenderablePoint(point) {
  return point && Number.isFinite(Number(point.price));
}

function getSegmentLabel(segment) {
  const direction = segment.direction === 'down' ? 'DOWN' : segment.direction === 'up' ? 'UP' : 'FLAT';
  return `${segment.timeframe || '1H'} ${direction} LEG`;
}

export function renderComparisonSegments() {
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

  const descriptor = state.descriptor;
  const selected = getSelectedSegment();
  const descriptors = [];
  getSegments().forEach((segment) => {
    if (!isComparisonSegment(segment)) return;
    if (!segment.start || !segment.end) return;
    if (segment.display?.hidden) return;
    if (!shouldRenderSegment(segment)) return;
    if (!canProjectPriceObjectToComparison(segment, descriptor).ok) return;
    if (!hasRenderablePoint(segment.start) || !hasRenderablePoint(segment.end)) return;

    const startTime = getSegmentPointRenderTime(segment.start, descriptor.timeframe, displayBars);
    const endTime = getSegmentPointRenderTime(segment.end, descriptor.timeframe, displayBars);
    if (startTime === null || endTime === null) return;

    const isHighlighted = selected?.id === segment.id;
    const label = getSegmentLabel(segment);
    const options = {
      ...SEGMENT_LINE_STYLE,
      lineColor: isHighlighted
        ? HIGHLIGHT_COLOR
        : segment.direction === 'down'
          ? 'rgba(239, 83, 80, 0.78)'
          : 'rgba(38, 166, 154, 0.78)',
      textColor: '#f0f3fa',
      markerColor: isHighlighted ? HIGHLIGHT_COLOR : 'rgba(240, 243, 250, 0.72)',
      lineWidth: isHighlighted ? 3 : 2,
      markerSize: isHighlighted ? 5 : 4,
      showLabel: segment.display?.showLabel ?? true,
      labelFont: getChartLabelFont(11),
    };
    descriptors.push({
      create: () => new SegmentPrimitive(
        chartInstance,
        series,
        startTime,
        segment.start.price,
        endTime,
        segment.end.price,
        label,
        options
      ),
    });
  });

  clearRenderedPrimitives();
  renderedPrimitives = descriptors.map((descriptor) => descriptor.create());
  renderedPrimitives.forEach((primitive) => attachComparisonPrimitive(primitive));
}

const renderComparisonSegmentsOnSelection = createRafThrottle(renderComparisonSegments);

export function initComparisonSegmentRenderer() {
  bus.on('segment:changed', renderComparisonSegments);
  bus.on('segment:selected', renderComparisonSegmentsOnSelection);
  bus.on('segment:selection-cleared', renderComparisonSegmentsOnSelection);
  bus.on('display-mode:changed', renderComparisonSegments);
  bus.on('display-preferences:changed', renderComparisonSegments);
  bus.on('comparison-bars:loaded', renderComparisonSegments);
  bus.on('comparison-window:changed', renderComparisonSegments);
  bus.on('comparison-bars:cleared', clearRenderedPrimitives);
}
