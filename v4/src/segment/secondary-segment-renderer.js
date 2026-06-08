// Readonly segment and composite overlay for the split-screen secondary chart.

import * as bus from '../event-bus.js';
import {
  attachSecondaryPrimitive,
  clearSecondaryPrimitives,
  getSecondaryChart,
  getSecondarySeries,
} from '../chart/secondary-chart-manager.js';
import * as secondaryStore from '../data/secondary-chart-store.js';
import { getStructureOverlayVisibility } from '../display/overlay-visibility.js';
import { SegmentPrimitive } from '../chart/primitives.js';
import { getSegments } from './segment-store.js';
import { getSegmentGroups } from './segment-group-store.js';
import { getSegmentPointRenderTime } from './segment-time.js';

let renderedPrimitives = [];
const SEGMENT_LINE_STYLE = {
  lineDash: [6, 5],
  lineOpacity: 0.72,
  showMarkers: false,
};

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
  const groups = getSegmentGroups();
  const visibility = getStructureOverlayVisibility({ segments, groups });
  const segmentMap = new Map(segments.map((segment) => [segment.id, segment]));

  groups.forEach((group) => {
    if (!visibility.visibleGroupIds.has(group.id)) return;

    const children = getSortedGroupChildren(group, segmentMap);
    if (children.length < 2) return;

    const first = children[0];
    const last = children[children.length - 1];
    const isHighlighted = visibility.activeGroupIds?.has(group.id);
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
        ...SEGMENT_LINE_STYLE,
        lineColor: isHighlighted
          ? '#ffb74d'
          : group.direction === 'down'
            ? 'rgba(239, 83, 80, 0.34)'
            : 'rgba(38, 166, 154, 0.34)',
        textColor: isHighlighted ? '#f0f3fa' : '#b2b5be',
        markerColor: isHighlighted ? '#ffb74d' : 'rgba(240, 243, 250, 0.48)',
        lineWidth: isHighlighted ? 2 : 1,
        markerSize: isHighlighted ? 5 : 3,
        showLabel: group.display?.showLabel ?? true,
        labelFont: '10px sans-serif',
      }
    );
    attachSegmentPrimitive(primitive);
  });

  segments.forEach((segment) => {
    if (!segment.start || !segment.end) return;
    if (!visibility.visibleSegmentIds.has(segment.id)) return;
    if (visibility.hiddenSegmentIds.has(segment.id)) return;
    if (!hasRenderablePoint(segment.start) || !hasRenderablePoint(segment.end)) return;
    const isHighlighted = visibility.activeSegmentIds?.has(segment.id);

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
        ...SEGMENT_LINE_STYLE,
        lineColor: isHighlighted
          ? '#ffb74d'
          : segment.direction === 'down'
            ? 'rgba(239, 83, 80, 0.78)'
            : 'rgba(38, 166, 154, 0.78)',
        textColor: '#f0f3fa',
        markerColor: isHighlighted ? '#ffb74d' : 'rgba(240, 243, 250, 0.72)',
        lineWidth: isHighlighted ? 3 : 2,
        markerSize: isHighlighted ? 5 : 4,
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
  bus.on('drawing-set-focus:changed', renderSecondarySegments);
  bus.on('display-mode:changed', renderSecondarySegments);
  bus.on('secondary-bars:loaded', renderSecondarySegments);
  bus.on('secondary-chart:settings-changed', renderSecondarySegments);
  bus.on('secondary-bars:cleared', clearRenderedPrimitives);
  bus.on('secondary-chart:reset', clearRenderedPrimitives);
}
