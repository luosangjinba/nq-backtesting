import * as store from '../../data/bar-store.js';
import {
  findDisplayBarByTime,
  getBarChartTime as getProjectedBarChartTime,
  normalizeChartTime,
} from '../../chart/time-projection.js';
import { ORDER_RESULTS } from '../../order/order-review-types.js';
import { formatTimeInput } from '../../utils.js';

export function getSegmentTimestamp(segment) {
  return segment?.end?.timestamp ?? segment?.end?.time ?? segment?.start?.timestamp ?? segment?.start?.time ?? null;
}

export function getSegmentPrice(segment) {
  return segment?.end?.price ?? segment?.start?.price ?? null;
}

export function asTimestamp(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function parseDateTimeInput(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return { ok: true, timestamp: null, formatted: '' };
  const formatted = formatTimeInput(trimmed);
  const normalized = formatted.replace(' ', 'T');
  const parsed = Date.parse(`${normalized.endsWith('Z') ? normalized : `${normalized}Z`}`);
  if (!Number.isFinite(parsed)) return { ok: false, formatted };
  return { ok: true, timestamp: Math.floor(parsed / 1000), formatted };
}

export function isAutoExitResult(result) {
  return [
    ORDER_RESULTS.TARGET1,
    ORDER_RESULTS.TARGET2,
    ORDER_RESULTS.TARGET3,
    ORDER_RESULTS.STOP_LOSS,
    ORDER_RESULTS.BREAKEVEN,
  ].includes(result);
}

export function getAutoExitReasonMessage(reason) {
  const messages = {
    'missing-entry-time': 'Auto exit time skipped: missing entry time',
    'missing-direction': 'Auto exit time skipped: missing direction',
    'missing-exit-price': 'Auto exit time skipped: missing target/stop/BE price',
    'unsupported-result': 'Auto exit time skipped for this Result',
    'not-touched': 'Auto exit time not found in the 1m lookahead window',
  };
  return messages[reason] || `Auto exit time skipped: ${reason || 'unknown reason'}`;
}

export function normalizeTimeKey(time) {
  return normalizeChartTime(time);
}

export function getBarChartTime(bar, timeframe = store.getCurrentTimeframe()) {
  return getProjectedBarChartTime(bar, timeframe);
}

export function findDisplayBarByChartTime(time) {
  if (time === undefined || time === null) return null;
  return findDisplayBarByTime(store.getDisplayBars(), time, store.getCurrentTimeframe());
}

export function getPointTimestamp(point = {}) {
  return asTimestamp(point.canonicalTimestamp ?? point.timestamp ?? point.anchorTime ?? point.time);
}

export function getAnnotationTimestampRange(annotation = {}) {
  const pointTimestamps = Array.isArray(annotation.points)
    ? annotation.points.map(getPointTimestamp).filter((timestamp) => timestamp !== null)
    : [];
  if (pointTimestamps.length) {
    return {
      start: Math.min(...pointTimestamps),
      end: Math.max(...pointTimestamps),
    };
  }

  const startCandidates = [
    annotation.startTimeTimestamp,
    annotation.start?.timestamp,
    annotation.start?.time,
    annotation.startTime,
    annotation.canonicalTimestamp,
    annotation.timestamp,
    annotation.anchorTime,
  ];
  const endCandidates = [
    annotation.endTimeTimestamp,
    annotation.end?.timestamp,
    annotation.end?.time,
    annotation.endTime,
    annotation.canonicalTimestamp,
    annotation.timestamp,
    annotation.anchorTime,
  ];
  const start = startCandidates.map(asTimestamp).find((timestamp) => timestamp !== null);
  const end = endCandidates.map(asTimestamp).find((timestamp) => timestamp !== null);
  if (start === null || end === null) return null;

  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

export function getSegmentTimestampRange(segment = {}) {
  const start = asTimestamp(segment.start?.timestamp ?? segment.start?.time);
  const end = asTimestamp(segment.end?.timestamp ?? segment.end?.time);
  if (start === null || end === null) return null;
  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

export function parseOrderReviewFieldValue(target) {
  const field = target.dataset.orderReviewField;
  if (field === 'entryPatterns') {
    const container = target.closest('.order-entry-patterns');
    return Array.from(container?.querySelectorAll('input[data-order-entry-pattern]:checked') || [])
      .map((input) => input.dataset.orderEntryPattern)
      .filter(Boolean);
  }
  if (target.type === 'checkbox') return target.checked;
  return target.value;
}
