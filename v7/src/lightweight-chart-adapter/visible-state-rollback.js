const DATASET_FIELDS = Object.freeze([
  'barCount',
  'displayTimeframeId',
  'futureTimeAxisPointCount',
  'instrumentId',
  'lastApplyMs',
  'lastMutationMode',
  'lastMutationMs',
  'lastPaintMs',
  'lastPaintProof',
  'latestDisplayEpochMs',
  'latestFutureTimeAxisEpochMs',
  'latestOffsetBars',
  'logicalFrom',
  'logicalTo',
  'maximumDisplayGapMs',
  'painted',
  'sessionHoursMode',
  'spanBars',
  'viewportOrigin',
  'viewportRevision',
  'visibleRevision',
  'visibleThroughEpochMs',
]);

function copyRange(value) {
  return value === null ? null : Object.freeze({ from: value.from, to: value.to });
}

function captureDataset(host) {
  return Object.freeze(Object.fromEntries(DATASET_FIELDS.map((field) => [
    field,
    Object.hasOwn(host.dataset, field) ? host.dataset[field] : null,
  ])));
}

function restoreDataset(host, dataset) {
  for (const field of DATASET_FIELDS) {
    if (dataset[field] === null) delete host.dataset[field];
    else host.dataset[field] = dataset[field];
  }
}

/** Capture the last accepted chart surface before a fallible visible mutation. */
export function captureAdapterVisibleState({
  adapterRevision,
  appliedBars,
  appliedData,
  appliedFutureTimeAxisData,
  barCount,
  chart,
  host,
  maximumDisplayGapMs,
  priceScale,
}) {
  return Object.freeze({
    adapterRevision,
    appliedBars,
    appliedData,
    appliedFutureTimeAxisData,
    barCount,
    dataset: captureDataset(host),
    logicalRange: copyRange(chart.timeScale().getVisibleLogicalRange()),
    maximumDisplayGapMs,
    priceAutoScale: priceScale.options().autoScale === true,
    priceRange: copyRange(priceScale.getVisibleRange()),
  });
}

/** Restore the accepted horizontal and vertical scale state after a data mutation settles. */
export function restoreAdapterScaleState({ chart, priceScale, state }) {
  if (state.logicalRange === null) chart.timeScale().resetTimeScale();
  else chart.timeScale().setVisibleLogicalRange(state.logicalRange);
  priceScale.setAutoScale(state.priceAutoScale);
  if (!state.priceAutoScale && state.priceRange !== null) {
    priceScale.setVisibleRange(state.priceRange);
  }
}

/** Restore one previously accepted chart surface after apply, paint, or receipt failure. */
export function restoreAdapterVisibleState({ chart, futureTimeAxisSeries, host, priceScale, state }) {
  futureTimeAxisSeries.setData(state.appliedFutureTimeAxisData);
  restoreAdapterScaleState({ chart, priceScale, state });
  restoreDataset(host, state.dataset);
  return Object.freeze({
    adapterRevision: state.adapterRevision,
    appliedBars: state.appliedBars,
    appliedData: state.appliedData,
    appliedFutureTimeAxisData: state.appliedFutureTimeAxisData,
    barCount: state.barCount,
    maximumDisplayGapMs: state.maximumDisplayGapMs,
  });
}
