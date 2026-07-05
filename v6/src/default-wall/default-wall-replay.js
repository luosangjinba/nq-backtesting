const DEFAULT_PANE_ID = 'main';
const DEFAULT_PREFIX_BARS = 120;
const DEFAULT_RIGHT_OFFSET_BARS = 8;
const DEFAULT_SPAN_BARS = 120;

function normalizeInteger(value, fieldName, { min = 0 } = {}) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < min) {
    throw new Error(`Default wall replay ${fieldName} must be an integer >= ${min}.`);
  }
  return normalized;
}

function normalizePositiveInteger(value, fieldName) {
  return normalizeInteger(value, fieldName, { min: 1 });
}

function normalizePaneId(paneId) {
  const normalized = String(paneId || '').trim();
  if (!normalized) {
    throw new Error('Default wall replay paneId must be a non-empty string.');
  }
  return normalized;
}

function normalizeBar(bar) {
  const timestamp = Number(bar?.timestamp ?? bar?.time);
  if (!Number.isFinite(timestamp)) {
    throw new Error('Default wall replay bars must include a finite timestamp.');
  }
  return Object.freeze({
    close: Number(bar.close),
    high: Number(bar.high),
    low: Number(bar.low),
    open: Number(bar.open),
    timestamp,
  });
}

function cloneBars(bars = []) {
  return bars.map((bar) => ({ ...bar }));
}

function freezeState(state) {
  return Object.freeze({
    chartBars: Object.freeze(cloneBars(state.chartBars)),
    cursorIndex: state.cursorIndex,
    forwardBars: Object.freeze(cloneBars(state.forwardBars)),
    latestBar: state.latestBar ? Object.freeze({ ...state.latestBar }) : null,
    paneId: state.paneId,
    projection: Object.freeze({ ...state.projection }),
    settings: Object.freeze({ ...state.settings }),
  });
}

export function projectDefaultWallRange({
  latestLogicalIndex,
  latestOffsetBars = DEFAULT_RIGHT_OFFSET_BARS,
  spanBars = DEFAULT_SPAN_BARS,
} = {}) {
  const latestIndex = normalizeInteger(latestLogicalIndex, 'latestLogicalIndex');
  const offset = normalizeInteger(latestOffsetBars, 'latestOffsetBars');
  const span = normalizePositiveInteger(spanBars, 'spanBars');
  const to = latestIndex + offset;
  return Object.freeze({
    from: to - span,
    latestLogicalIndex: latestIndex,
    latestOffsetBars: offset,
    origin: 'default',
    spanBars: span,
    to,
  });
}

export function createDefaultWallReplayState({
  bars = [],
  latestOffsetBars = DEFAULT_RIGHT_OFFSET_BARS,
  paneId = DEFAULT_PANE_ID,
  prefixBars = DEFAULT_PREFIX_BARS,
  spanBars = DEFAULT_SPAN_BARS,
  startIndex = 0,
} = {}) {
  const normalizedBars = bars.map(normalizeBar).sort((left, right) => left.timestamp - right.timestamp);
  if (!normalizedBars.length) {
    throw new Error('Default wall replay requires at least one bar.');
  }
  const cursorIndex = Math.min(
    normalizeInteger(startIndex, 'startIndex'),
    normalizedBars.length - 1,
  );
  const prefixCount = normalizeInteger(prefixBars, 'prefixBars');
  const firstVisibleIndex = Math.max(0, cursorIndex - prefixCount);
  const chartBars = normalizedBars.slice(firstVisibleIndex, cursorIndex + 1);
  const latestLogicalIndex = chartBars.length - 1;

  return freezeState({
    chartBars,
    cursorIndex,
    forwardBars: normalizedBars.slice(cursorIndex + 1),
    latestBar: chartBars.at(-1),
    paneId: normalizePaneId(paneId),
    projection: projectDefaultWallRange({
      latestLogicalIndex,
      latestOffsetBars,
      spanBars,
    }),
    settings: {
      latestOffsetBars: normalizeInteger(latestOffsetBars, 'latestOffsetBars'),
      prefixBars: prefixCount,
      spanBars: normalizePositiveInteger(spanBars, 'spanBars'),
    },
  });
}

export function advanceDefaultWallReplayState(state) {
  if (!state) {
    throw new Error('Default wall replay state is required.');
  }
  const nextBar = state.forwardBars[0];
  if (!nextBar) {
    return freezeState(state);
  }
  const chartBars = [...state.chartBars, nextBar];
  const settings = state.settings || {};
  const projection = projectDefaultWallRange({
    latestLogicalIndex: chartBars.length - 1,
    latestOffsetBars: settings.latestOffsetBars,
    spanBars: settings.spanBars,
  });

  return freezeState({
    chartBars,
    cursorIndex: state.cursorIndex + 1,
    forwardBars: state.forwardBars.slice(1),
    latestBar: nextBar,
    paneId: state.paneId,
    projection,
    settings,
  });
}

export function createDefaultWallChartReplacePayload(state) {
  if (!state) {
    throw new Error('Default wall replay state is required.');
  }
  return Object.freeze({
    bars: cloneBars(state.chartBars),
    cursorTimestamp: state.latestBar?.timestamp ?? null,
    paneId: state.paneId,
  });
}

export function createDefaultWallChartAppendPayload(state) {
  if (!state?.latestBar) {
    throw new Error('Default wall replay state with latestBar is required.');
  }
  return Object.freeze({
    bars: [{ ...state.latestBar }],
    cursorTimestamp: state.latestBar.timestamp,
    paneId: state.paneId,
  });
}
