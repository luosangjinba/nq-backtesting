// Readonly segment and composite overlay for the split-screen secondary chart.

import * as bus from '../event-bus.js';
import {
  attachSecondaryPrimitive,
  clearSecondaryPrimitives,
  getSecondaryChart,
  getSecondarySeries,
} from '../chart/secondary-chart-manager.js';
import * as secondaryStore from '../data/secondary-chart-store.js';
import { SegmentPrimitive } from '../chart/primitives.js';
import { shouldRenderSegment, shouldRenderSegmentGroup } from '../display/display-mode.js';
import { getSegments } from './segment-store.js';
import { getSegmentGroups } from './segment-group-store.js';
import { getSegmentPointRenderTime } from './segment-time.js';

let renderedPrimitives = [];

function clearRenderedPrimitives() {
  renderedPrimitives = clearSecondaryPrimitives(renderedPrimitives);
}

function getSegmentLabel(segment) {
  const direction = segment.direction === 'down' ? 'DOWN' : segment.direction === 'up' ? 'UP' : 'FLAT';
  return `${segment.timeframe || '1H'} ${direction} LEG`;
}

function getGroupLabel(group, childCount) {
  const direction = group.direction === 'down' ? 'DOWN' : group.direction === 'up' ? 'UP' : 'FLAT';
  return `Composite ${direction} (${childCount})`;
}

function getSortedGroupChildren(group, segmentMap) {
  return (Array.isArray(group.childSegmentIds) ? group.childSegmentIds : [])
    .map((id) => segmentMap.get(id))
    .filter(Boolean)
    .sort((a, b) => Number(a.start?.timestamp ?? a.start?.time ?? 0) - Number(b.start?.timestamp ?? b.start?.time ?? 0));
}

function hasRenderablePoint(point) {
  return point && Number.isFinite(Number(point.price));
}

function attachSegmentPrimitive(primitive) {
  attachSecondaryPrimitive(primitive);
  primitive.requestUpdate();
  renderedPrimitives.push(primitive);
}

export function renderSecondarySegments() {
  clearRenderedPrimitives();

  if (!secondaryStore.isSecondaryEnabled()) return;

  const chartInstance = getSecondaryChart();
  const series = getSecondarySeries();
  if (!chartInstance || !series) return;

  const secondaryTf = secondaryStore.getSecondaryTimeframe();
  const segments = getSegments();
  const segmentMap = new Map(segments.map((segment) => [segment.id, segment]));

  getSegmentGroups().forEach((group) => {
    if (!shouldRenderSegmentGroup(group)) return;

    const children = getSortedGroupChildren(group, segmentMap);
    if (children.length < 2) return;

    const first = children[0];
    const last = children[children.length - 1];
    if (!hasRenderablePoint(first.start) || !hasRenderablePoint(last.end)) return;

    const startTime = getSegmentPointRenderTime(first.start, secondaryTf);
    const endTime = getSegmentPointRenderTime(last.end, secondaryTf);
    if (startTime === null || endTime === null) return;

    const primitive = new SegmentPrimitive(
      chartInstance,
      series,
      startTime,
      first.start.price,
      endTime,
      last.end.price,
      getGroupLabel(group, children.length),
      {
        lineColor: group.direction === 'down' ? 'rgba(239, 83, 80, 0.34)' : 'rgba(38, 166, 154, 0.34)',
        textColor: '#b2b5be',
        markerColor: 'rgba(240, 243, 250, 0.48)',
        lineWidth: 1,
        markerSize: 3,
        showLabel: group.display?.showLabel ?? true,
        labelFont: '10px sans-serif',
      }
    );
    attachSegmentPrimitive(primitive);
  });

  segments.forEach((segment) => {
    if (!segment.start || !segment.end) return;
    if (!shouldRenderSegment(segment)) return;
    if (!hasRenderablePoint(segment.start) || !hasRenderablePoint(segment.end)) return;

    const startTime = getSegmentPointRenderTime(segment.start, secondaryTf);
    const endTime = getSegmentPointRenderTime(segment.end, secondaryTf);
    if (startTime === null || endTime === null) return;

    const primitive = new SegmentPrimitive(
      chartInstance,
      series,
      startTime,
      segment.start.price,
      endTime,
      segment.end.price,
      getSegmentLabel(segment),
      {
        lineColor: segment.direction === 'down' ? 'rgba(239, 83, 80, 0.78)' : 'rgba(38, 166, 154, 0.78)',
        textColor: '#f0f3fa',
        markerColor: 'rgba(240, 243, 250, 0.72)',
        lineWidth: 2,
        markerSize: 4,
        showLabel: segment.display?.showLabel ?? true,
      }
    );
    attachSegmentPrimitive(primitive);
  });
}

export function initSecondarySegmentRenderer() {
  bus.on('segment:changed', renderSecondarySegments);
  bus.on('segment-group:changed', renderSecondarySegments);
  bus.on('segment:selected', renderSecondarySegments);
  bus.on('segment-group:selected', renderSecondarySegments);
  bus.on('segment:selection-cleared', renderSecondarySegments);
  bus.on('segment-group:selection-cleared', renderSecondarySegments);
  bus.on('display-mode:changed', renderSecondarySegments);
  bus.on('secondary-bars:loaded', renderSecondarySegments);
  bus.on('secondary-chart:settings-changed', renderSecondarySegments);
  bus.on('secondary-bars:cleared', clearRenderedPrimitives);
  bus.on('secondary-chart:reset', clearRenderedPrimitives);
}
