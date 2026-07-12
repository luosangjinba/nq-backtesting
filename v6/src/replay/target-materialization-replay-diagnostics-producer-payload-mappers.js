const DISPLAY_TIMEFRAME_APPLIED_EVENT = 'displayTimeframe:applied';
const MANUAL_NEXT_ADVANCED_EVENT = 'chartEntryManualNext:advanced';
const AUTO_PLAY_STARTED_EVENT = 'chartEntryAutoPlay:started';
const AUTO_PLAY_TICKED_EVENT = 'chartEntryAutoPlay:ticked';
const AUTO_PLAY_STOPPED_EVENT = 'chartEntryAutoPlay:stopped';

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value, fallback = null) {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeTimestamp(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' && Number.isNaN(Number(value))) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.floor(numeric) : null;
}

function latestBarTimestamp(bars) {
  if (!Array.isArray(bars) || !bars.length) return null;
  const latest = bars.at(-1);
  return normalizeTimestamp(latest?.timestamp ?? latest?.time);
}

function compactUpdate(update) {
  const entries = Object.entries(update).filter(([, value]) => value !== null && value !== undefined);
  if (!entries.length) return null;
  return Object.freeze(Object.fromEntries(entries));
}

function baseUpdate(update = {}) {
  return compactUpdate({
    sourceCursorAuthority: true,
    targetBarsDisplayInputOnly: true,
    ...update,
  });
}

function resolvePaneId(...candidates) {
  for (const candidate of candidates) {
    const value = normalizeString(candidate, null);
    if (value) return value;
  }
  return null;
}

function resolveFallbackStatus(targetHistory = {}) {
  if (!isObject(targetHistory)) return null;
  if (targetHistory.status === 'applied') return 'available';
  if (targetHistory.status === 'fallback') return normalizeString(targetHistory.reason, 'fallback');
  if (targetHistory.status === 'disabled') return 'target-history-disabled';
  return normalizeString(targetHistory.status, null);
}

export function mapDisplayTimeframeAppliedToDiagnosticsUpdate(payload = {}) {
  if (!isObject(payload)) return null;
  const chartRecord = isObject(payload.chartRecord) ? payload.chartRecord : {};
  const pane = isObject(payload.pane) ? payload.pane : {};
  const projectionSource = isObject(payload.projectionSource) ? payload.projectionSource : {};
  const targetHistory = isObject(payload.targetHistory) ? payload.targetHistory : {};
  const latestDisplayTimestamp = latestBarTimestamp(chartRecord.bars);
  const cursorTimestamp = normalizeTimestamp(chartRecord.cursorTimestamp);

  return baseUpdate({
    displayApplyStatus: 'applied',
    displayTimeframe: normalizeString(pane.displayTimeframe, null),
    fallbackStatus: resolveFallbackStatus(targetHistory),
    latestDisplayTimestamp,
    latestSourceTimestamp: cursorTimestamp ?? latestDisplayTimestamp,
    paneId: resolvePaneId(pane.id, chartRecord.paneId, payload.viewportRecord?.paneId),
    projectionOwner: normalizeString(projectionSource.owner, null),
    targetHistoryReason: normalizeString(targetHistory.reason, null),
    targetHistoryStatus: normalizeString(targetHistory.status, null),
  });
}

export function mapManualNextAdvancedToDiagnosticsUpdate(payload = {}) {
  if (!isObject(payload)) return null;
  const replayState = isObject(payload.replayState) ? payload.replayState : {};
  const chartRecord = isObject(payload.chartRecord) ? payload.chartRecord : {};
  const loadedWindow = isObject(payload.loadedWindow) ? payload.loadedWindow : {};
  const latestSourceTimestamp = normalizeTimestamp(replayState.cursorTime)
    ?? normalizeTimestamp(chartRecord.cursorTimestamp)
    ?? latestBarTimestamp(chartRecord.bars);

  return baseUpdate({
    latestSourceTimestamp,
    manualNextStatus: normalizeString(payload.status, 'advanced'),
    paneId: resolvePaneId(chartRecord.paneId, loadedWindow.paneId, payload.loadedWindows?.[0]?.paneId),
    sourceCursorTime: normalizeString(replayState.cursorTime, null),
  });
}

export function mapAutoPlayStateToDiagnosticsUpdate(payload = {}, {
  eventName = AUTO_PLAY_TICKED_EVENT,
} = {}) {
  if (!isObject(payload)) return null;
  const replayState = isObject(payload.lastTick?.replayState)
    ? payload.lastTick.replayState
    : {};
  const status = eventName === AUTO_PLAY_STARTED_EVENT
    ? 'started'
    : eventName === AUTO_PLAY_STOPPED_EVENT
      ? normalizeString(payload.status, 'stopped')
      : normalizeString(payload.status, 'ticked');

  return baseUpdate({
    autoPlayStatus: status,
    fallbackStatus: normalizeString(payload.error, null),
    latestSourceTimestamp: normalizeTimestamp(replayState.cursorTime),
    paneId: resolvePaneId(payload.paneId, payload.paneIds?.[0]),
    sourceCursorTime: normalizeString(replayState.cursorTime, null),
  });
}

export function mapTargetMaterializationReplayDiagnosticsProducerPayload(eventName, payload = {}) {
  switch (eventName) {
    case DISPLAY_TIMEFRAME_APPLIED_EVENT:
      return mapDisplayTimeframeAppliedToDiagnosticsUpdate(payload);
    case MANUAL_NEXT_ADVANCED_EVENT:
      return mapManualNextAdvancedToDiagnosticsUpdate(payload);
    case AUTO_PLAY_STARTED_EVENT:
    case AUTO_PLAY_TICKED_EVENT:
    case AUTO_PLAY_STOPPED_EVENT:
      return mapAutoPlayStateToDiagnosticsUpdate(payload, { eventName });
    default:
      return null;
  }
}

export function getTargetMaterializationReplayDiagnosticsProducerEventNames() {
  return [
    DISPLAY_TIMEFRAME_APPLIED_EVENT,
    MANUAL_NEXT_ADVANCED_EVENT,
    AUTO_PLAY_STARTED_EVENT,
    AUTO_PLAY_TICKED_EVENT,
    AUTO_PLAY_STOPPED_EVENT,
  ];
}
