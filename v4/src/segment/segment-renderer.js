// Draw manual market segments on the chart.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import { SegmentPrimitive } from '../chart/primitives.js';
import { getIsolatedSegment, getSegments } from './segment-store.js';
import { getSelectedSegment, getSelectedSegmentGroup } from './segment-selection.js';
import { getIsolateCompanionSegments } from './segment-isolate-view.js';
import {
  getDraftSegmentGroupChildIds,
  getDraftSegmentGroupTargetId,
  getSegmentGroups,
} from './segment-group-store.js';
import { shouldRenderSegment, shouldRenderSegmentGroup } from '../display/display-mode.js';
import { getSegmentPointRenderTime } from './segment-time.js';
import { getActiveDrawingSetVisibility } from './drawing-set-list.js';

let renderedPrimitives = [];
const SELECTED_COLOR = '#f0f3fa';
const DRAFT_CHILD_COLOR = '#ffb74d';
const DRAFT_TARGET_COLOR = '#ba68c8';
const SEGMENT_LINE_STYLE = {
  lineDash: [6, 5],
  lineOpacity: 0.72,
  showMarkers: false,
};

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

function getSortedGroupChildren(group) {
  const segmentMap = new Map(getSegments().map((segment) => [segment.id, segment]));
  return (Array.isArray(group.childSegmentIds) ? group.childSegmentIds : [])
    .map((id) => segmentMap.get(id))
    .filter(Boolean)
    .sort((a, b) => Number(a.start?.timestamp ?? a.start?.time ?? 0) - Number(b.start?.timestamp ?? b.start?.time ?? 0));
}

function getGroupLabel(group, childCount) {
  const direction = group.direction === 'down' ? 'DOWN' : group.direction === 'up' ? 'UP' : 'FLAT';
  return `Composite ${direction} (${childCount})`;
}

export function renderSegments() {
  clearRenderedPrimitives();

  const chartInstance = chart.getChart();
  const series = chart.getSeries();
  if (!chartInstance || !series) return;

  const selected = getSelectedSegment();
  const selectedGroup = getSelectedSegmentGroup();
  const drawingSetVisibility = getActiveDrawingSetVisibility();
  const isolatedSegment = getIsolatedSegment();
  const isolateCompanionIds = new Set(getIsolateCompanionSegments(isolatedSegment).map((segment) => segment.id));
  const isolateVisibleIds = new Set(
    isolatedSegment ? [isolatedSegment.id, ...Array.from(isolateCompanionIds)] : []
  );

  getSegmentGroups().forEach((group) => {
    if (group.display?.hidden) return;
    const children = getSortedGroupChildren(group);
    if (children.length < 2) return;
    if (isolatedSegment && !children.some((segment) => isolateVisibleIds.has(segment.id))) return;
    const isDrawingSetActive = drawingSetVisibility.activeGroupIds.has(group.id);
    if (!isolatedSegment && !isDrawingSetActive && !shouldRenderSegmentGroup(group)) return;
    const isCurrent = selectedGroup?.id === group.id;
    const shouldHighlight = isCurrent || isDrawingSetActive;

    const first = children[0];
    const last = children[children.length - 1];
    const primitive = new SegmentPrimitive(
      chartInstance,
      series,
      getSegmentPointRenderTime(first.start),
      first.start.price,
      getSegmentPointRenderTime(last.end),
      last.end.price,
      getGroupLabel(group, children.length),
      {
        ...SEGMENT_LINE_STYLE,
        lineColor: isCurrent
          ? SELECTED_COLOR
          : isDrawingSetActive
            ? DRAFT_CHILD_COLOR
          : group.direction === 'down'
            ? 'rgba(239, 83, 80, 0.42)'
            : 'rgba(38, 166, 154, 0.42)',
        textColor: shouldHighlight ? SELECTED_COLOR : '#b2b5be',
        markerColor: isCurrent
          ? SELECTED_COLOR
          : isDrawingSetActive
            ? DRAFT_CHILD_COLOR
            : 'rgba(240, 243, 250, 0.55)',
        lineWidth: shouldHighlight ? 2 : 1,
        markerSize: shouldHighlight ? 5 : 3,
        showLabel: group.display?.showLabel ?? true,
        labelFont: '10px sans-serif',
      }
    );
    chart.attachPrimitive(primitive);
    primitive.requestUpdate();
    renderedPrimitives.push(primitive);
  });

  const draftChildIds = new Set(getDraftSegmentGroupChildIds());
  const draftTargetId = getDraftSegmentGroupTargetId();
  const selectedGroupModel = selectedGroup
    ? getSegmentGroups().find((group) => group.id === selectedGroup.id)
    : null;
  const selectedGroupChildIds = new Set(selectedGroupModel?.childSegmentIds || []);
  const selectedGroupTargetId = selectedGroupModel?.targetSegmentId || '';
  getSegments().forEach((segment) => {
    if (!segment.start || !segment.end) return;
    if (segment.display?.hidden) return;
    const isIsolated = isolatedSegment?.id === segment.id;
    const isIsolateCompanion = isolateCompanionIds.has(segment.id);
    const isolateMode = isIsolated ? getIsolateDisplayMode(segment) : null;
    if (isolateMode === 'hidden') return;
    const isCurrent = isIsolated ? isolateMode === 'highlight' : selected?.id === segment.id;
    const isSelectedGroupChild = selectedGroupChildIds.has(segment.id);
    const isSelectedGroupTarget = selectedGroupTargetId === segment.id;
    const isDraftChild = draftChildIds.has(segment.id);
    const isDraftTarget = draftTargetId === segment.id;
    const isDrawingSetActive = drawingSetVisibility.activeSegmentIds.has(segment.id);
    if (isolatedSegment && !isIsolated && !isIsolateCompanion) return;
    if (!isolatedSegment && !isDrawingSetActive && !shouldRenderSegment(segment)) return;
    const isGroupChildContext = isDraftChild || isSelectedGroupChild;
    const isGroupTargetContext = isDraftTarget || isSelectedGroupTarget;
    const shouldHighlight = isCurrent || isDrawingSetActive;
    const lineColor = isCurrent
      ? SELECTED_COLOR
      : isDrawingSetActive
        ? DRAFT_CHILD_COLOR
      : isGroupTargetContext
        ? DRAFT_TARGET_COLOR
        : isGroupChildContext
          ? DRAFT_CHILD_COLOR
          : segment.direction === 'down'
            ? '#ef5350'
            : '#26a69a';
    const primitive = new SegmentPrimitive(
      chartInstance,
      series,
      getSegmentPointRenderTime(segment.start),
      segment.start.price,
      getSegmentPointRenderTime(segment.end),
      segment.end.price,
      getSegmentLabel(segment),
      {
        ...SEGMENT_LINE_STYLE,
        lineColor,
        textColor: '#f0f3fa',
        markerColor: isCurrent
          ? SELECTED_COLOR
          : isDrawingSetActive
            ? DRAFT_CHILD_COLOR
          : isGroupTargetContext
            ? DRAFT_TARGET_COLOR
            : isGroupChildContext
              ? DRAFT_CHILD_COLOR
              : '#f0f3fa',
        lineWidth: shouldHighlight || isGroupTargetContext || isGroupChildContext ? 3 : 2,
        markerSize: shouldHighlight || isGroupTargetContext || isGroupChildContext ? 5 : 4,
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
  bus.on('segment-group:changed', renderSegments);
  bus.on('segment:selected', renderSegments);
  bus.on('segment-group:selected', renderSegments);
  bus.on('segment:selection-cleared', renderSegments);
  bus.on('segment-group:selection-cleared', renderSegments);
  bus.on('drawing-set-focus:changed', renderSegments);
  bus.on('display-mode:changed', renderSegments);
  bus.on('bars:loaded', renderSegments);
  bus.on('bars:cleared', clearRenderedPrimitives);
}
