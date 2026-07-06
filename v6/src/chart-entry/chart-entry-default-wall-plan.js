const DEFAULT_PANE_ID = 'main';
const DEFAULT_PREFIX_BARS = 120;
const DEFAULT_SPAN_BARS = 80;
const DEFAULT_LATEST_OFFSET_BARS = 12;

function normalizeText(value, fieldName) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error(`Chart entry default wall ${fieldName} must be a non-empty string.`);
  }
  return normalized;
}

function normalizePositiveInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`Chart entry default wall ${fieldName} must be a positive integer.`);
  }
  return normalized;
}

function normalizeNonNegativeInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 0) {
    throw new Error(`Chart entry default wall ${fieldName} must be a non-negative integer.`);
  }
  return normalized;
}

function normalizeIsoTime(value, fieldName) {
  const normalized = normalizeText(value, fieldName);
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.valueOf())) {
    throw new Error(`Chart entry default wall ${fieldName} must be a valid date/time.`);
  }
  return parsed.toISOString();
}

function cloneWindow(window) {
  return window ? { ...window } : null;
}

function cloneRecordSummary(record) {
  return record ? { ...record } : null;
}

export function createChartEntryDefaultWallPlan(bootstrap, {
  latestOffsetBars = DEFAULT_LATEST_OFFSET_BARS,
  paneId = DEFAULT_PANE_ID,
  prefixBars = DEFAULT_PREFIX_BARS,
  spanBars = DEFAULT_SPAN_BARS,
} = {}) {
  const sessionId = normalizeText(bootstrap?.sessionId, 'sessionId');
  const replayState = bootstrap?.replayState;
  const context = bootstrap?.context;
  if (!replayState) {
    throw new Error('Chart entry default wall replay state is required.');
  }
  if (!context) {
    throw new Error('Chart entry default wall context is required.');
  }
  if (!context.loadedWindow && !context.plannedWindow) {
    throw new Error('Chart entry default wall context window is required.');
  }

  return Object.freeze({
    anchor: normalizeIsoTime(context.anchor || replayState.cursorTime, 'anchor'),
    context: Object.freeze({
      loadedWindow: Object.freeze(cloneWindow(context.loadedWindow || context.plannedWindow)),
      plannedWindow: Object.freeze(cloneWindow(context.plannedWindow || context.loadedWindow)),
      record: Object.freeze(cloneRecordSummary(context.record)),
    }),
    cursorIndex: normalizeNonNegativeInteger(replayState.cursorIndex, 'cursorIndex'),
    cursorTime: normalizeIsoTime(replayState.cursorTime, 'cursorTime'),
    latestOffsetBars: normalizeNonNegativeInteger(latestOffsetBars, 'latestOffsetBars'),
    owner: 'runtime.chartEntryDefaultWallPlan',
    paneId: normalizeText(paneId, 'paneId'),
    prefixBars: normalizePositiveInteger(prefixBars, 'prefixBars'),
    replayStatus: normalizeText(replayState.status, 'replayStatus'),
    sessionId,
    spanBars: normalizePositiveInteger(spanBars, 'spanBars'),
    status: 'planned',
    symbol: normalizeText(replayState.symbol, 'symbol'),
    timeframe: normalizeText(replayState.timeframe, 'timeframe'),
  });
}

export function getDefaultWallPlanDefaults() {
  return Object.freeze({
    latestOffsetBars: DEFAULT_LATEST_OFFSET_BARS,
    paneId: DEFAULT_PANE_ID,
    prefixBars: DEFAULT_PREFIX_BARS,
    spanBars: DEFAULT_SPAN_BARS,
  });
}
