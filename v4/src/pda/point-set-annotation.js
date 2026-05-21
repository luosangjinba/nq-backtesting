// Manual EQH/EQL point-set workflow. Session-scoped; no DB writes.

import * as bus from '../event-bus.js';
import * as store from '../data/bar-store.js';
import { timeframeToString } from '../config.js';
import { addAnnotation, removeAnnotation, upsertAnnotationById } from './pda-store.js';
import { getPdaType } from './pda-types.js';

const POINT_SET_DRAFT_ID = 'manual_point_set_draft';

let pointSetSelectionState = null;

function getPointSetPrice(type, bar) {
  return type === 'eqh' ? bar.high : bar.low;
}

function getPointSetColors(type) {
  return type === 'eqh'
    ? { color: '#26a69a', textColor: '#b2dfdb' }
    : { color: '#ef5350', textColor: '#ffcdd2' };
}

function clearPointSetDraft() {
  removeAnnotation(POINT_SET_DRAFT_ID);
}

function buildPointSetAnnotation(type, points, { draft = false } = {}) {
  const pdaType = getPdaType(type);
  if (!pdaType || points.length < 1) return null;

  const prices = points.map((point) => Number(point.price));
  const referencePrice = type === 'eqh' ? Math.max(...prices) : Math.min(...prices);
  const tfLabel = timeframeToString(store.getCurrentTimeframe());
  const sortedPoints = [...points].sort((a, b) => a.canonicalTimestamp - b.canonicalTimestamp);

  return {
    id: draft ? POINT_SET_DRAFT_ID : `manual_${type}_${sortedPoints[0].canonicalTimestamp}_${Date.now()}`,
    type,
    source: draft ? 'draft' : 'manual',
    draft,
    anchorTime: sortedPoints[0].anchorTime,
    canonicalTimestamp: sortedPoints[0].canonicalTimestamp,
    timestamp: sortedPoints[0].timestamp,
    price: referencePrice,
    referencePrice,
    markerPosition: type === 'eqh' ? 'above' : 'below',
    points: sortedPoints,
    contexts: [`${tfLabel} ${pdaType.label}${draft ? ' draft' : ''} (${sortedPoints.length})`],
    ...getPointSetColors(type),
  };
}

function updatePointSetDraft() {
  if (!pointSetSelectionState || pointSetSelectionState.points.length < 1) {
    clearPointSetDraft();
    return;
  }

  const annotation = buildPointSetAnnotation(
    pointSetSelectionState.type,
    pointSetSelectionState.points,
    { draft: true }
  );
  if (annotation) upsertAnnotationById(annotation);
}

function addPointToSelection(type, bar, getBarChartTime) {
  if (!bar) return false;
  if (!pointSetSelectionState || pointSetSelectionState.type !== type) {
    pointSetSelectionState = { type, points: [] };
  }

  const canonicalTimestamp = bar.timestamp;
  const existing = pointSetSelectionState.points.some(
    (point) => point.canonicalTimestamp === canonicalTimestamp
  );
  if (existing) return false;

  pointSetSelectionState.points = [
    ...pointSetSelectionState.points,
    {
      anchorTime: getBarChartTime(bar),
      canonicalTimestamp,
      timestamp: bar.timestamp,
      barTime: bar.time,
      tradingDay: bar.tradingDay,
      price: getPointSetPrice(type, bar),
    },
  ];
  return true;
}

export function getPointSetSelectionSummary() {
  if (!pointSetSelectionState) return null;
  const pdaType = getPdaType(pointSetSelectionState.type);
  return {
    type: pointSetSelectionState.type,
    label: pdaType?.label || pointSetSelectionState.type.toUpperCase(),
    count: pointSetSelectionState.points.length,
  };
}

export function startPointSet(type, bar, getBarChartTime) {
  const pdaType = getPdaType(type);
  if (!pdaType || !bar) return;

  pointSetSelectionState = { type, points: [] };
  addPointToSelection(type, bar, getBarChartTime);
  updatePointSetDraft();
  bus.emit('status:update', {
    text: `${pdaType.label} 集合已开始：1 个点，继续右键添加点，完成时选择 Finish ${pdaType.label}`,
    isError: false,
  });
}

export function addPointSetPoint(bar, getBarChartTime) {
  if (!pointSetSelectionState) return;
  const { type } = pointSetSelectionState;
  const pdaType = getPdaType(type);
  if (!pdaType || !bar) return;

  const added = addPointToSelection(type, bar, getBarChartTime);
  updatePointSetDraft();
  bus.emit('status:update', {
    text: added
      ? `${pdaType.label} 集合已添加：${pointSetSelectionState.points.length} 个点`
      : `${pdaType.label} 集合已包含该点`,
    isError: !added,
  });
}

export function cancelPointSet() {
  const label = pointSetSelectionState ? getPdaType(pointSetSelectionState.type)?.label : 'Point set';
  pointSetSelectionState = null;
  clearPointSetDraft();
  bus.emit('status:update', { text: `${label} 集合已取消`, isError: false });
}

export function finishPointSet() {
  if (!pointSetSelectionState) return;

  const { type, points } = pointSetSelectionState;
  const pdaType = getPdaType(type);
  if (!pdaType || points.length < 2) {
    bus.emit('status:update', { text: 'EQH/EQL 至少需要 2 个点', isError: true });
    return;
  }

  const prices = points.map((point) => Number(point.price));
  const spread = Math.max(...prices) - Math.min(...prices);
  const annotation = buildPointSetAnnotation(type, points);

  clearPointSetDraft();
  addAnnotation(annotation);
  pointSetSelectionState = null;
  bus.emit('status:update', {
    text: `${pdaType.label}: ${annotation.points.length} 个点 · line ${annotation.referencePrice.toFixed(2)} · spread ${spread.toFixed(2)}`,
    isError: false,
  });
}

export function clearPointSetSelection({ silent = false } = {}) {
  const hadSelection = Boolean(pointSetSelectionState);
  pointSetSelectionState = null;
  clearPointSetDraft();
  if (hadSelection && !silent) {
    bus.emit('status:update', { text: 'EQH/EQL 集合已取消', isError: false });
  }
}
