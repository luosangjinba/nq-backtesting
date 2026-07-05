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

  function getRecord(paneId) {
    const id = normalizePaneId(paneId);
    const record = recordsByPaneId.get(id) || createEmptyChartBarsRecord(id);
    return cloneChartBarsRecord(record);
  }

  function replaceBars({
    bars = [],
    cursorTimestamp = null,
    paneId,
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
    return cloneChartBarsRecord(record);
  }

  function appendBars({
    bars = [],
    cursorTimestamp = null,
    paneId,
  } = {}) {
    const id = normalizePaneId(paneId);
    const current = getRecord(id);
    const record = createChartBarsRecord({
      bars: mergeChartBars(current.bars, bars, cursorTimestamp),
      paneId: id,
      revision: current.revision + 1,
    });
    recordsByPaneId.set(id, record);
    return cloneChartBarsRecord(record);
  }

  function clearPane(paneId) {
    const id = normalizePaneId(paneId);
    recordsByPaneId.delete(id);
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
    replaceBars,
    summary,
  };
}
