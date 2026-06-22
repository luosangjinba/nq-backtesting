import * as bus from '../event-bus.js';
import { getChartNotes } from '../chart-notes/chart-note-store.js';
import { TIMEFRAME_TO_SECONDS } from '../config.js';
import { getLiveRecords } from '../live-record/live-record-store.js';
import { getOrderReviews } from '../order/order-review-store.js';
import { getAnnotations } from '../pda/pda-store.js';
import { canRenderPdaPriceProjection } from '../pda/pda-projection.js';
import { getSegments } from '../segment/segment-store.js';
import { getCurrentTimeframe } from '../data/bar-store.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { COMPARISON_OVERLAY_SYNC_MODE } from './comparison-view-contract.js';
import { getComparisonWindowState } from './comparison-window-store.js';

function normalizeInstrument(value, fallback = 'NQ') {
  return String(value || fallback).trim().toUpperCase();
}

function normalizeTimeframe(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function normalizeTimeframeToMinutes(value) {
  const numeric = normalizeTimeframe(value);
  if (numeric !== null) return numeric;
  const label = String(value || '').trim().toUpperCase();
  const seconds = TIMEFRAME_TO_SECONDS[label];
  return Number.isFinite(seconds) && seconds > 0 ? seconds / 60 : null;
}

function getObjectInstrument(object = {}) {
  return normalizeInstrument(object.sourceInstrument || object.instrument || object.anchor?.instrument);
}

function getObjectTimeframe(object = {}) {
  return normalizeTimeframeToMinutes(
    object.sourceTimeframe ??
      object.timeframe ??
      object.anchor?.timeframe ??
      object.sourceTimeframeLabel ??
      object.timeframeLabel
  );
}

export function canProjectPriceObjectToComparison(object = {}, descriptor = {}) {
  const targetInstrument = normalizeInstrument(descriptor.instrument);
  const sourceInstrument = getObjectInstrument(object);
  if (sourceInstrument !== targetInstrument) {
    return {
      ok: false,
      reason: 'instrument-mismatch',
      sourceInstrument,
      targetInstrument,
    };
  }

  const sourceTimeframe = getObjectTimeframe(object);
  const targetTimeframe = normalizeTimeframeToMinutes(descriptor.timeframe);
  if (sourceTimeframe !== null && targetTimeframe !== null && sourceTimeframe !== targetTimeframe) {
    return {
      ok: false,
      reason: 'timeframe-mismatch',
      sourceTimeframe,
      targetTimeframe,
    };
  }

  return { ok: true, reason: 'match', sourceInstrument, targetInstrument };
}

export function canProjectPdaToComparison(annotation = {}, descriptor = {}) {
  if (!canRenderPdaPriceProjection(annotation, descriptor.instrument)) {
    return {
      ok: false,
      reason: 'instrument-mismatch',
      sourceInstrument: getObjectInstrument(annotation),
      targetInstrument: normalizeInstrument(descriptor.instrument),
    };
  }
  return canProjectPriceObjectToComparison(annotation, descriptor);
}

export function getComparisonOverlaySyncPolicy(state = getComparisonWindowState()) {
  const descriptor = state?.descriptor || {};
  const mode = descriptor.overlaySyncMode === COMPARISON_OVERLAY_SYNC_MODE.sync
    ? COMPARISON_OVERLAY_SYNC_MODE.sync
    : COMPARISON_OVERLAY_SYNC_MODE.noSync;
  const primaryInstrument = normalizeInstrument(getPrimaryInstrument());
  const comparisonInstrument = normalizeInstrument(descriptor.instrument);
  const primaryTimeframe = normalizeTimeframeToMinutes(getCurrentTimeframe());
  const comparisonTimeframe = normalizeTimeframeToMinutes(descriptor.timeframe);
  const safe =
    mode === COMPARISON_OVERLAY_SYNC_MODE.sync &&
    primaryInstrument === comparisonInstrument &&
    primaryTimeframe !== null &&
    comparisonTimeframe !== null &&
    primaryTimeframe === comparisonTimeframe;
  return {
    mode,
    safe,
    reason: safe ? 'match' : mode === COMPARISON_OVERLAY_SYNC_MODE.noSync ? 'no-sync' : 'instrument-or-timeframe-mismatch',
    primaryInstrument,
    comparisonInstrument,
    primaryTimeframe,
    comparisonTimeframe,
  };
}

function getSourceChartId(object = {}) {
  return object.sourceChartId || object.chartId || 'primary';
}

function isComparisonSource(object = {}) {
  return getSourceChartId(object) === 'comparison-window';
}

export function canRenderObjectOnChartTarget(object = {}, targetChartId = 'primary', state = getComparisonWindowState()) {
  const sourceChartId = getSourceChartId(object);
  const policy = getComparisonOverlaySyncPolicy(state);
  const descriptor = targetChartId === 'comparison-window'
    ? state?.descriptor
    : { instrument: policy.primaryInstrument, timeframe: policy.primaryTimeframe };

  if (targetChartId === 'primary') {
    const projection = canProjectPriceObjectToComparison(object, descriptor);
    return projection.ok
      ? { ok: true, reason: sourceChartId === targetChartId ? 'local-source' : 'main-owned', policy }
      : { ok: false, reason: projection.reason, policy };
  }

  if (targetChartId !== 'comparison-window') {
    return sourceChartId === targetChartId
      ? { ok: true, reason: 'local-source' }
      : { ok: false, reason: 'unsupported-source-target', policy };
  }

  if (!policy.safe) return { ok: false, reason: policy.reason, policy };

  const projection = canProjectPriceObjectToComparison(object, descriptor);
  return projection.ok
    ? { ok: true, reason: 'sync', policy }
    : { ok: false, reason: projection.reason, policy };
}

function summarizeObjects(items, descriptor, projector = canProjectPriceObjectToComparison) {
  return items.reduce(
    (summary, item) => {
      const result = projector(item, descriptor);
      if (result.ok) summary.eligible += 1;
      else summary.filtered += 1;
      return summary;
    },
    { total: items.length, eligible: 0, filtered: 0 }
  );
}

export function getComparisonOverlaySummary(state = getComparisonWindowState()) {
  const descriptor = state.descriptor;
  const pda = summarizeObjects(getAnnotations(), descriptor, canProjectPdaToComparison);
  const segments = summarizeObjects(getSegments(), descriptor);
  const chartNotes = summarizeObjects(getChartNotes(), descriptor);
  const orders = summarizeObjects(getOrderReviews(), descriptor);
  const liveRecords = summarizeObjects(getLiveRecords(), descriptor);
  const priceTotal = pda.total + segments.total + chartNotes.total + orders.total + liveRecords.total;
  const priceEligible = pda.eligible + segments.eligible + chartNotes.eligible + orders.eligible + liveRecords.eligible;
  const priceFiltered = pda.filtered + segments.filtered + chartNotes.filtered + orders.filtered + liveRecords.filtered;

  return {
    enabled: state.enabled,
    descriptor,
    timeOverlayReady: state.enabled && state.displayBars.length > 0,
    priceTotal,
    priceEligible,
    priceFiltered,
    groups: {
      pda,
      segments,
      chartNotes,
      orders,
      liveRecords,
    },
  };
}

export function formatComparisonOverlaySummary(summary = getComparisonOverlaySummary()) {
  if (!summary.enabled) return 'Overlays idle';
  if (!summary.timeOverlayReady) return 'Overlays waiting for comparison data';
  const guarded = summary.priceTotal > 0
    ? ` · price overlays guarded ${summary.priceEligible}/${summary.priceTotal}`
    : ' · no price overlays';
  return `Time overlays ready${guarded}`;
}

export function updateComparisonOverlayStatus() {
  const el = document.querySelector('[data-comparison-overlay-status]');
  if (!el) return;
  const summary = getComparisonOverlaySummary();
  el.textContent = formatComparisonOverlaySummary(summary);
  el.dataset.priceEligible = String(summary.priceEligible);
  el.dataset.priceFiltered = String(summary.priceFiltered);
  el.dataset.priceTotal = String(summary.priceTotal);
}

export function initComparisonOverlayPolicy() {
  [
    'comparison-window:changed',
    'comparison-bars:loaded',
    'comparison-bars:cleared',
    'pda:changed',
    'segment:changed',
    'chart-notes:changed',
    'order-review:changed',
    'live-record:changed',
    'time-overlays:changed',
  ].forEach((eventName) => bus.on(eventName, updateComparisonOverlayStatus));
}
