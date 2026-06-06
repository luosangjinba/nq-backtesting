// Manual EQH/EQL point-set workflow. Session-scoped; no DB writes.

import * as bus from '../event-bus.js';
import * as store from '../data/bar-store.js';
import { timeframeToString } from '../config.js';
import {
  addAnnotation,
  getAnnotationById,
  removeAnnotation,
  updateAnnotation,
  upsertAnnotationById,
} from './pda-store.js';
import { getPdaType } from './pda-types.js';

const POINT_SET_DRAFT_ID = 'manual_point_set_draft';
const DEFAULT_POINT_SET_SCOPE = 'primary';

const pointSetSelectionStates = new Map();

function getPointSetScope(options = {}) {
  return options.scope || DEFAULT_POINT_SET_SCOPE;
}

function getPointSetDraftId(scope = DEFAULT_POINT_SET_SCOPE) {
  return scope === DEFAULT_POINT_SET_SCOPE ? POINT_SET_DRAFT_ID : `${POINT_SET_DRAFT_ID}_${scope}`;
}

function getPointSetState(options = {}) {
  return pointSetSelectionStates.get(getPointSetScope(options)) || null;
}

function setPointSetState(scope, state) {
  if (state) pointSetSelectionStates.set(scope, state);
  else pointSetSelectionStates.delete(scope);
}

function buildPointSetOptions(options = {}) {
  return {
    scope: getPointSetScope(options),
    timeframe: options.timeframe,
    contextLabel: options.contextLabel,
    metadata: options.metadata || {},
  };
}

function getPointSetPrice(type, bar) {
  return type === 'eqh' ? bar.high : bar.low;
}

function getPointSetColors(type) {
  return type === 'eqh'
    ? { color: '#26a69a', textColor: '#b2dfdb' }
    : { color: '#ef5350', textColor: '#ffcdd2' };
}

function buildPoint(type, bar, getBarChartTime) {
  return {
    anchorTime: getBarChartTime(bar),
    canonicalTimestamp: bar.timestamp,
    timestamp: bar.timestamp,
    barTime: bar.time,
    tradingDay: bar.tradingDay,
    price: getPointSetPrice(type, bar),
  };
}

function clearPointSetDraft(scope = DEFAULT_POINT_SET_SCOPE) {
  removeAnnotation(getPointSetDraftId(scope));
}

function buildPointSetAnnotation(type, points, { draft = false, options = {} } = {}) {
  const pdaType = getPdaType(type);
  if (!pdaType || points.length < 1) return null;

  const prices = points.map((point) => Number(point.price));
  const referencePrice = type === 'eqh' ? Math.max(...prices) : Math.min(...prices);
  const tfLabel = timeframeToString(options.timeframe || store.getCurrentTimeframe());
  const sortedPoints = [...points].sort((a, b) => a.canonicalTimestamp - b.canonicalTimestamp);
  const contexts = [
    options.contextLabel,
    `${tfLabel} ${pdaType.label}${draft ? ' draft' : ''} (${sortedPoints.length})`,
  ].filter(Boolean);

  return {
    id: draft ? getPointSetDraftId(options.scope) : `manual_${type}_${sortedPoints[0].canonicalTimestamp}_${Date.now()}`,
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
    contexts,
    ...options.metadata,
    ...getPointSetColors(type),
  };
}

function updatePointSetDraft(scope = DEFAULT_POINT_SET_SCOPE) {
  const pointSetSelectionState = pointSetSelectionStates.get(scope);
  if (!pointSetSelectionState || pointSetSelectionState.points.length < 1) {
    clearPointSetDraft(scope);
    return;
  }

  const annotation = buildPointSetAnnotation(
    pointSetSelectionState.type,
    pointSetSelectionState.points,
    { draft: true, options: pointSetSelectionState.options }
  );
  if (annotation) upsertAnnotationById(annotation);
}

function addPointToSelection(type, bar, getBarChartTime, options = {}) {
  if (!bar) return false;
  const scope = getPointSetScope(options);
  let pointSetSelectionState = pointSetSelectionStates.get(scope);
  if (!pointSetSelectionState || pointSetSelectionState.type !== type) {
    pointSetSelectionState = { type, points: [], options: buildPointSetOptions(options) };
    setPointSetState(scope, pointSetSelectionState);
  }

  const canonicalTimestamp = bar.timestamp;
  const existing = pointSetSelectionState.points.some(
    (point) => point.canonicalTimestamp === canonicalTimestamp
  );
  if (existing) return false;

  pointSetSelectionState.points = [
    ...pointSetSelectionState.points,
    buildPoint(type, bar, getBarChartTime),
  ];
  setPointSetState(scope, pointSetSelectionState);
  return true;
}

export function appendPointToPointSet(annotationId, bar, getBarChartTime) {
  const annotation = getAnnotationById(annotationId);
  const pdaType = annotation ? getPdaType(annotation.type) : null;
  if (!annotation || !pdaType?.pointSet || !bar) return;

  const exists = (annotation.points || []).some(
    (point) => point.canonicalTimestamp === bar.timestamp || point.timestamp === bar.timestamp
  );
  if (exists) {
    bus.emit('status:update', {
      text: `${pdaType.label} 已包含该点`,
      isError: true,
    });
    return;
  }

  const nextPoints = [...(annotation.points || []), buildPoint(annotation.type, bar, getBarChartTime)];
  const nextAnnotation = buildPointSetAnnotation(annotation.type, nextPoints, {
    options: {
      timeframe: annotation.sourceTimeframe,
      contextLabel: annotation.sourceContext,
      metadata: {
        sourceChartId: annotation.sourceChartId,
        sourceChartLabel: annotation.sourceChartLabel,
        sourceInstrument: annotation.sourceInstrument,
        sourceTimeframe: annotation.sourceTimeframe,
        sourceTimeframeLabel: annotation.sourceTimeframeLabel,
        sourceContext: annotation.sourceContext,
      },
    },
  });
  updateAnnotation(annotation.id, {
    anchorTime: nextAnnotation.anchorTime,
    canonicalTimestamp: nextAnnotation.canonicalTimestamp,
    timestamp: nextAnnotation.timestamp,
    price: nextAnnotation.price,
    referencePrice: nextAnnotation.referencePrice,
    markerPosition: nextAnnotation.markerPosition,
    points: nextAnnotation.points,
    contexts: nextAnnotation.contexts,
    color: nextAnnotation.color,
    textColor: nextAnnotation.textColor,
  });

  bus.emit('status:update', {
    text: `${pdaType.label} 已追加点：${nextAnnotation.points.length} 个点 · line ${nextAnnotation.referencePrice.toFixed(2)}`,
    isError: false,
  });
}

export function getPointSetSelectionSummary(options = {}) {
  const pointSetSelectionState = getPointSetState(options);
  if (!pointSetSelectionState) return null;
  const pdaType = getPdaType(pointSetSelectionState.type);
  return {
    type: pointSetSelectionState.type,
    label: pdaType?.label || pointSetSelectionState.type.toUpperCase(),
    count: pointSetSelectionState.points.length,
  };
}

export function startPointSet(type, bar, getBarChartTime, options = {}) {
  const pdaType = getPdaType(type);
  if (!pdaType || !bar) return;

  const scope = getPointSetScope(options);
  setPointSetState(scope, { type, points: [], options: buildPointSetOptions(options) });
  addPointToSelection(type, bar, getBarChartTime, options);
  updatePointSetDraft(scope);
  bus.emit('status:update', {
    text: `${pdaType.label} 集合已开始：1 个点，继续右键添加点，完成时选择 Finish ${pdaType.label}`,
    isError: false,
  });
}

export function addPointSetPoint(bar, getBarChartTime, options = {}) {
  const pointSetSelectionState = getPointSetState(options);
  if (!pointSetSelectionState) return;
  const { type } = pointSetSelectionState;
  const pdaType = getPdaType(type);
  if (!pdaType || !bar) return;

  const scope = getPointSetScope(options);
  const added = addPointToSelection(type, bar, getBarChartTime, pointSetSelectionState.options);
  updatePointSetDraft(scope);
  bus.emit('status:update', {
    text: added
      ? `${pdaType.label} 集合已添加：${getPointSetState(options)?.points.length || 0} 个点`
      : `${pdaType.label} 集合已包含该点`,
    isError: !added,
  });
}

export function cancelPointSet(options = {}) {
  const scope = getPointSetScope(options);
  const pointSetSelectionState = getPointSetState(options);
  const label = pointSetSelectionState ? getPdaType(pointSetSelectionState.type)?.label : 'Point set';
  setPointSetState(scope, null);
  clearPointSetDraft(scope);
  bus.emit('status:update', { text: `${label} 集合已取消`, isError: false });
}

export function finishPointSet(options = {}) {
  const scope = getPointSetScope(options);
  const pointSetSelectionState = getPointSetState(options);
  if (!pointSetSelectionState) return;

  const { type, points } = pointSetSelectionState;
  const pdaType = getPdaType(type);
  if (!pdaType || points.length < 2) {
    bus.emit('status:update', { text: 'EQH/EQL 至少需要 2 个点', isError: true });
    return;
  }

  const prices = points.map((point) => Number(point.price));
  const spread = Math.max(...prices) - Math.min(...prices);
  const annotation = buildPointSetAnnotation(type, points, { options: pointSetSelectionState.options });

  clearPointSetDraft(scope);
  addAnnotation(annotation);
  setPointSetState(scope, null);
  bus.emit('status:update', {
    text: `${pdaType.label}: ${annotation.points.length} 个点 · line ${annotation.referencePrice.toFixed(2)} · spread ${spread.toFixed(2)}`,
    isError: false,
  });
}

export function clearPointSetSelection({ silent = false, scope = DEFAULT_POINT_SET_SCOPE } = {}) {
  const hadSelection = Boolean(pointSetSelectionStates.get(scope));
  setPointSetState(scope, null);
  clearPointSetDraft(scope);
  if (hadSelection && !silent) {
    bus.emit('status:update', { text: 'EQH/EQL 集合已取消', isError: false });
  }
}
