import {
  cloneChartBarsRecord,
  createChartBarsRecord,
  createEmptyChartBarsRecord,
  mergeChartBars,
} from './chart-bars.js';

function normalizePaneId(paneId) {
  const normalized = String(paneId || '').trim();
  if (!normalized) {
    throw new Error('Chart data paneId must be a non-empty string.');
  }
  return normalized;
}

export function createChartDataStore() {
  const recordsByPaneId = new Map();
  const sourceRecordsByPaneId = new Map();

  function getRecord(paneId) {
    const id = normalizePaneId(paneId);
    const record = recordsByPaneId.get(id) || createEmptyChartBarsRecord(id);
    return cloneChartBarsRecord(record);
  }

  function getSourceRecord(paneId) {
    const id = normalizePaneId(paneId);
    const record = sourceRecordsByPaneId.get(id) || recordsByPaneId.get(id) || createEmptyChartBarsRecord(id);
    return cloneChartBarsRecord(record);
  }

  function replaceBars({
    bars = [],
    cursorTimestamp = null,
    paneId,
    preserveSource = false,
    sourceBars = null,
  } = {}) {
    const id = normalizePaneId(paneId);
    const current = getRecord(id);
    const record = createChartBarsRecord({
      bars,
      cursorTimestamp,
      paneId: id,
      revision: current.revision + 1,
    });
    recordsByPaneId.set(id, record);
    if (!preserveSource) {
      const currentSource = getSourceRecord(id);
      const sourceRecord = createChartBarsRecord({
        bars: Array.isArray(sourceBars) ? sourceBars : bars,
        cursorTimestamp,
        paneId: id,
        revision: currentSource.revision + 1,
      });
      sourceRecordsByPaneId.set(id, sourceRecord);
    }
    return cloneChartBarsRecord(record);
  }

  function appendBars({
    bars = [],
    cursorTimestamp = null,
    paneId,
    preserveSource = false,
    sourceBars = null,
  } = {}) {
    const id = normalizePaneId(paneId);
    const current = getRecord(id);
    const record = createChartBarsRecord({
      bars: mergeChartBars(current.bars, bars, cursorTimestamp),
      paneId: id,
      revision: current.revision + 1,
    });
    recordsByPaneId.set(id, record);
    if (!preserveSource) {
      const currentSource = getSourceRecord(id);
      const sourceRecord = createChartBarsRecord({
        bars: mergeChartBars(
          currentSource.bars,
          Array.isArray(sourceBars) ? sourceBars : bars,
          cursorTimestamp,
        ),
        paneId: id,
        revision: currentSource.revision + 1,
      });
      sourceRecordsByPaneId.set(id, sourceRecord);
    }
    return cloneChartBarsRecord(record);
  }

  function prependBars({
    bars = [],
    cursorTimestamp = null,
    paneId,
    preserveSource = false,
    sourceBars = null,
  } = {}) {
    const id = normalizePaneId(paneId);
    const current = getRecord(id);
    const record = createChartBarsRecord({
      bars: mergeChartBars(bars, current.bars, cursorTimestamp),
      paneId: id,
      revision: current.revision + 1,
    });
    recordsByPaneId.set(id, record);
    if (!preserveSource) {
      const currentSource = getSourceRecord(id);
      const sourceRecord = createChartBarsRecord({
        bars: mergeChartBars(
          Array.isArray(sourceBars) ? sourceBars : bars,
          currentSource.bars,
          cursorTimestamp,
        ),
        paneId: id,
        revision: currentSource.revision + 1,
      });
      sourceRecordsByPaneId.set(id, sourceRecord);
    }
    return cloneChartBarsRecord(record);
  }

  function clearPane(paneId) {
    const id = normalizePaneId(paneId);
    recordsByPaneId.delete(id);
    sourceRecordsByPaneId.delete(id);
    return createEmptyChartBarsRecord(id);
  }

  function summary() {
    const records = [...recordsByPaneId.values()];
    return {
      paneCount: records.length,
      panes: records
        .map((record) => ({
          barCount: record.bars.length,
          paneId: record.paneId,
          revision: record.revision,
        }))
        .sort((left, right) => left.paneId.localeCompare(right.paneId)),
    };
  }

  return {
    appendBars,
    clearPane,
    getRecord,
    getSourceRecord,
    prependBars,
    replaceBars,
    summary,
  };
}
