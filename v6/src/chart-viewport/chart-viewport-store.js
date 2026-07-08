import {
  createDefaultWallIntent,
  promoteMeasuredRangeToManualIntent,
  resetToDefaultWallIntent,
  updateIntentCursor,
} from '../viewport/viewport-intent.js';
import { projectIntentToLogicalRange } from '../viewport/viewport-projection.js';

const DEFAULT_RIGHT_OFFSET_BARS = 8;
const DEFAULT_SPAN_BARS = 120;

function normalizePaneId(paneId) {
  const normalized = String(paneId || '').trim();
  if (!normalized) {
    throw new Error('Chart viewport paneId must be a non-empty string.');
  }
  return normalized;
}

function normalizeCursorTimestamp(cursorTimestamp) {
  const timestamp = Number(cursorTimestamp);
  if (!Number.isFinite(timestamp)) {
    throw new Error('Chart viewport cursorTimestamp must be finite.');
  }
  return timestamp;
}

function normalizeRevision(revision = 0) {
  const normalized = Number(revision);
  if (!Number.isInteger(normalized) || normalized < 0) {
    throw new Error('Chart viewport revision must be a non-negative integer.');
  }
  return normalized;
}

function normalizeSpanBars(spanBars) {
  if (spanBars === null || spanBars === undefined) return null;
  const normalized = Number(spanBars);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error('Chart viewport spanBars must be a positive number.');
  }
  return normalized;
}

function cloneRecord(record) {
  return {
    chartBarsRevision: record.chartBarsRevision,
    defaultLatestOffsetBars: record.defaultLatestOffsetBars,
    intent: { ...record.intent },
    paneId: record.paneId,
    projection: record.projection ? { ...record.projection } : null,
  };
}

export function createChartViewportStore({
  defaultRightOffsetBars = DEFAULT_RIGHT_OFFSET_BARS,
  defaultSpanBars = DEFAULT_SPAN_BARS,
} = {}) {
  const recordsByPaneId = new Map();

  function getRecord(paneId) {
    const id = normalizePaneId(paneId);
    const record = recordsByPaneId.get(id);
    return record ? cloneRecord(record) : null;
  }

  function ensureIntent(paneId, {
    cursorTimestamp,
    latestOffsetBars = defaultRightOffsetBars,
    spanBars = null,
  } = {}) {
    const id = normalizePaneId(paneId);
    const existing = recordsByPaneId.get(id);
    if (existing) {
      return cloneRecord(existing);
    }
    const record = {
      chartBarsRevision: 0,
      defaultLatestOffsetBars: Number(latestOffsetBars),
      intent: createDefaultWallIntent({
        cursorTimestamp: normalizeCursorTimestamp(cursorTimestamp),
        latestOffsetBars,
        spanBars: normalizeSpanBars(spanBars),
      }),
      paneId: id,
      projection: null,
    };
    recordsByPaneId.set(id, record);
    return cloneRecord(record);
  }

  function setManualIntent(paneId, measurement = {}) {
    const id = normalizePaneId(paneId);
    const existing = recordsByPaneId.get(id);
    if (!existing) {
      throw new Error(`Chart viewport pane "${id}" has no viewport intent.`);
    }
    const record = {
      ...existing,
      intent: promoteMeasuredRangeToManualIntent(existing.intent, measurement),
      projection: null,
    };
    recordsByPaneId.set(id, record);
    return cloneRecord(record);
  }

  function resetView(paneId, {
    cursorTimestamp,
    latestOffsetBars,
    spanBars = null,
  } = {}) {
    const id = normalizePaneId(paneId);
    const existing = recordsByPaneId.get(id);
    if (!existing) {
      throw new Error(`Chart viewport pane "${id}" has no viewport intent.`);
    }
    const record = {
      ...existing,
      intent: resetToDefaultWallIntent(existing.intent, {
        cursorTimestamp: cursorTimestamp === undefined
          ? existing.intent.cursorTimestamp
          : normalizeCursorTimestamp(cursorTimestamp),
        latestOffsetBars: latestOffsetBars === undefined
          ? existing.defaultLatestOffsetBars ?? defaultRightOffsetBars
          : latestOffsetBars,
        spanBars: normalizeSpanBars(spanBars),
      }),
      projection: null,
    };
    recordsByPaneId.set(id, record);
    return cloneRecord(record);
  }

  function updateCursor(cursorTimestamp) {
    const timestamp = normalizeCursorTimestamp(cursorTimestamp);
    const records = [];
    for (const [paneId, existing] of recordsByPaneId.entries()) {
      const record = {
        ...existing,
        intent: updateIntentCursor(existing.intent, timestamp),
      };
      recordsByPaneId.set(paneId, record);
      records.push(cloneRecord(record));
    }
    return records;
  }

  function applyChartDataRevision(paneId, {
    chartBarsRevision,
    latestLogicalIndex,
  } = {}) {
    const id = normalizePaneId(paneId);
    const existing = recordsByPaneId.get(id);
    if (!existing) {
      throw new Error(`Chart viewport pane "${id}" has no viewport intent.`);
    }
    const record = {
      ...existing,
      chartBarsRevision: normalizeRevision(chartBarsRevision),
      projection: projectIntentToLogicalRange(existing.intent, {
        defaultSpanBars,
        latestLogicalIndex,
      }),
    };
    recordsByPaneId.set(id, record);
    return cloneRecord(record);
  }

  function snapshot() {
    return {
      panes: [...recordsByPaneId.values()]
        .map(cloneRecord)
        .sort((left, right) => left.paneId.localeCompare(right.paneId)),
    };
  }

  return {
    applyChartDataRevision,
    ensureIntent,
    getRecord,
    resetView,
    setManualIntent,
    snapshot,
    updateCursor,
  };
}
