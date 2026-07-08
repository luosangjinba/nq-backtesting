import { createLightweightChartAdapter } from './lightweight-chart-adapter.js';

function normalizePaneId(paneId) {
  const id = String(paneId || '').trim();
  if (!id) {
    throw new Error('Chart host paneId must be a non-empty string.');
  }
  return id;
}

function cloneSnapshot(snapshot = {}) {
  return {
    ...snapshot,
    visibleLogicalRange: snapshot.visibleLogicalRange
      ? { ...snapshot.visibleLogicalRange }
      : null,
  };
}

function cloneCrosshair(crosshair = {}) {
  return {
    ...crosshair,
    bar: crosshair.bar ? { ...crosshair.bar } : null,
    point: crosshair.point ? { ...crosshair.point } : null,
  };
}

export function createChartHostManager({
  adapterFactory = createLightweightChartAdapter,
  chartOptions = {},
  seriesOptions = {},
} = {}) {
  const hostsByPaneId = new Map();

  function getMountedRecord(paneId) {
    const id = normalizePaneId(paneId);
    const record = hostsByPaneId.get(id);
    if (!record) {
      throw new Error(`Chart host pane "${id}" is not mounted.`);
    }
    return record;
  }

  function mountPane({ host, paneId } = {}) {
    const id = normalizePaneId(paneId);
    if (!host) {
      throw new Error('Chart host DOM node is required.');
    }
    if (hostsByPaneId.has(id)) {
      throw new Error(`Chart host pane "${id}" is already mounted.`);
    }
    const adapter = adapterFactory({
      chartOptions,
      seriesOptions,
    });
    adapter.mount(host);
    hostsByPaneId.set(id, {
      adapter,
      host,
      paneId: id,
    });
    return getPaneSnapshot(id);
  }

  function setData(paneId, bars = []) {
    const record = getMountedRecord(paneId);
    record.adapter.setData(bars);
    return getPaneSnapshot(record.paneId);
  }

  function update(paneId, bar) {
    const record = getMountedRecord(paneId);
    record.adapter.update(bar);
    return getPaneSnapshot(record.paneId);
  }

  function setVisibleLogicalRange(paneId, range) {
    const record = getMountedRecord(paneId);
    record.adapter.setVisibleLogicalRange(range);
    return getPaneSnapshot(record.paneId);
  }

  function setCrosshairPosition(paneId, crosshair = {}) {
    const record = getMountedRecord(paneId);
    record.adapter.setCrosshairPosition?.(crosshair);
    return getPaneSnapshot(record.paneId);
  }

  function clearCrosshairPosition(paneId) {
    const record = getMountedRecord(paneId);
    record.adapter.clearCrosshairPosition?.();
    return getPaneSnapshot(record.paneId);
  }

  function measureVisibleLogicalRange(paneId) {
    const record = getMountedRecord(paneId);
    const measured = record.adapter.measureVisibleLogicalRange();
    return measured ? { ...measured } : null;
  }

  function subscribeVisibleLogicalRangeChange(paneId, handler) {
    const record = getMountedRecord(paneId);
    if (typeof handler !== 'function') {
      throw new Error('Chart host visible range handler is required.');
    }
    if (typeof record.adapter.subscribeVisibleLogicalRangeChange !== 'function') {
      return () => {};
    }
    return record.adapter.subscribeVisibleLogicalRangeChange((range) => {
      handler({
        paneId: record.paneId,
        range: range ? { ...range } : null,
      });
    });
  }

  function subscribeCrosshairMove(paneId, handler) {
    const record = getMountedRecord(paneId);
    if (typeof handler !== 'function') {
      throw new Error('Chart host crosshair handler is required.');
    }
    if (typeof record.adapter.subscribeCrosshairMove !== 'function') {
      return () => {};
    }
    return record.adapter.subscribeCrosshairMove((crosshair) => {
      handler({
        ...cloneCrosshair(crosshair),
        paneId: record.paneId,
      });
    });
  }

  function resizePane(paneId, size) {
    const record = getMountedRecord(paneId);
    record.adapter.resize(size);
    return getPaneSnapshot(record.paneId);
  }

  function destroyPane(paneId) {
    const record = getMountedRecord(paneId);
    record.adapter.destroy();
    hostsByPaneId.delete(record.paneId);
  }

  function destroyAll() {
    for (const paneId of [...hostsByPaneId.keys()]) {
      destroyPane(paneId);
    }
  }

  function getPaneSnapshot(paneId) {
    const record = getMountedRecord(paneId);
    return {
      paneId: record.paneId,
      snapshot: cloneSnapshot(record.adapter.snapshot()),
    };
  }

  function snapshot() {
    return {
      panes: [...hostsByPaneId.keys()]
        .sort((left, right) => left.localeCompare(right))
        .map(getPaneSnapshot),
    };
  }

  return {
    clearCrosshairPosition,
    destroyAll,
    destroyPane,
    measureVisibleLogicalRange,
    mountPane,
    resizePane,
    setCrosshairPosition,
    setData,
    setVisibleLogicalRange,
    snapshot,
    subscribeCrosshairMove,
    subscribeVisibleLogicalRangeChange,
    update,
  };
}
