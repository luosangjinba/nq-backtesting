import { failProjection } from './projection-error.js';

const HANDLER_NAMES = Object.freeze(['onCancel', 'onCandidate', 'onSelect']);
const CLICK_CANDIDATE_TOLERANCE_PX = 12;

function requireMethod(owner, method) {
  if (typeof owner?.[method] !== 'function') {
    failProjection(
      'ANNOTATION_BAR_PICKER_CHART_INVALID',
      `Bar Picker Chart port requires ${method}().`,
    );
  }
}

function requireHandlers(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...HANDLER_NAMES].sort().join(',')) {
    failProjection('ANNOTATION_BAR_PICKER_HANDLERS_INVALID', 'Bar Picker handlers must be exact.');
  }
  for (const method of HANDLER_NAMES) {
    if (typeof value[method] !== 'function') {
      failProjection('ANNOTATION_BAR_PICKER_HANDLERS_INVALID', `Bar Picker requires ${method}().`);
    }
  }
  return value;
}

function requireCallback(value, label) {
  if (typeof value !== 'function') {
    failProjection('ANNOTATION_BAR_PICKER_CALLBACK_INVALID', `${label} must be a function.`);
  }
  return value;
}

/** Own only the bounded official Lightweight Charts subscriptions for one active Picker lease. */
export function createLightweightBarPickerSubscription({
  chart,
  handlers,
  nextSequence,
  onFailure,
  onSelection,
  paneId,
  resolveMarketEpochMs,
  series,
} = {}) {
  for (const method of [
    'subscribeClick', 'subscribeCrosshairMove', 'unsubscribeClick', 'unsubscribeCrosshairMove',
  ]) requireMethod(chart, method);
  const acceptedHandlers = requireHandlers(handlers);
  const acceptSequence = requireCallback(nextSequence, 'Bar Picker sequence source');
  const fail = requireCallback(onFailure, 'Bar Picker failure callback');
  const select = requireCallback(onSelection, 'Bar Picker selection callback');
  const captures = new WeakSet();
  let candidate = null;
  let lastExactCandidate = null;
  let disposed = false;

  function normalize(parameters) {
    if (!parameters || typeof parameters !== 'object'
      || !parameters.point || !Number.isFinite(parameters.point.x) || !Number.isFinite(parameters.point.y)
      || !(parameters.seriesData instanceof Map)) return null;
    const data = parameters.seriesData.get(series);
    if (!data || typeof data !== 'object' || typeof data.time !== 'number'
      || !Number.isFinite(data.time)) return null;
    const displayEpochMs = Math.round(data.time * 1_000);
    const barStartEpochMs = resolveMarketEpochMs(Object.freeze({ displayEpochMs, paneId }));
    if (!Number.isSafeInteger(barStartEpochMs) || barStartEpochMs < 0) {
      failProjection(
        'ANNOTATION_BAR_PICKER_RESOLUTION_FAILED',
        'Chart interaction could not resolve an exact Bar start.',
      );
    }
    return Object.freeze({ barStartEpochMs, paneId, sequence: acceptSequence() });
  }

  function onCandidate(parameters) {
    if (disposed) return;
    try {
      candidate = normalize(parameters);
      if (candidate !== null) {
        lastExactCandidate = Object.freeze({
          barStartEpochMs: candidate.barStartEpochMs,
          paneId: candidate.paneId,
          x: parameters.point.x,
        });
      }
      acceptedHandlers.onCandidate(candidate);
    } catch {
      candidate = null;
      lastExactCandidate = null;
      fail('bar-resolution-failed');
    }
  }

  function retainedClickSelection(parameters) {
    if (lastExactCandidate === null || !Number.isFinite(parameters?.point?.x)
      || Math.abs(parameters.point.x - lastExactCandidate.x) > CLICK_CANDIDATE_TOLERANCE_PX) {
      return null;
    }
    return Object.freeze({
      barStartEpochMs: lastExactCandidate.barStartEpochMs,
      paneId: lastExactCandidate.paneId,
      sequence: acceptSequence(),
    });
  }

  function onClick(parameters) {
    if (disposed) return;
    let selection;
    try { selection = normalize(parameters); } catch {
      fail('bar-resolution-failed');
      return;
    }
    if (selection === null) selection = retainedClickSelection(parameters);
    if (selection !== null) select(selection);
  }

  let clickSubscribed = false;
  let crosshairSubscribed = false;
  try {
    chart.subscribeClick(onClick);
    clickSubscribed = true;
    chart.subscribeCrosshairMove(onCandidate);
    crosshairSubscribed = true;
  } catch (cause) {
    if (crosshairSubscribed) chart.unsubscribeCrosshairMove(onCandidate);
    if (clickSubscribed) chart.unsubscribeClick(onClick);
    throw cause;
  }

  return Object.freeze({
    acceptSelection(capture) {
      if (disposed || !captures.has(capture)) return null;
      captures.delete(capture);
      return Object.freeze({ ...capture, sequence: acceptSequence() });
    },
    captureSelection() {
      if (disposed || candidate === null) return null;
      const capture = Object.freeze({
        barStartEpochMs: candidate.barStartEpochMs,
        paneId: candidate.paneId,
      });
      captures.add(capture);
      return capture;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      candidate = null;
      lastExactCandidate = null;
      chart.unsubscribeCrosshairMove(onCandidate);
      chart.unsubscribeClick(onClick);
    },
  });
}
