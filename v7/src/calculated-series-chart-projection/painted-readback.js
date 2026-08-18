import { failCalculatedSeriesChartProjection } from './projection-error.js';

function fail() {
  failCalculatedSeriesChartProjection(
    'CALCULATED_SERIES_CHART_NATIVE_RECEIPT_INVALID',
    'Native surface returned invalid or incomplete painted readback.',
  );
}

function safeCount(value) {
  if (!Number.isSafeInteger(value) || value < 0) fail();
  return value;
}

function exactRecord(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) fail();
  return value;
}

function exactStringArray(value, expected) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')
    || JSON.stringify(value) !== JSON.stringify(expected)) fail();
  return Object.freeze([...value]);
}

function expectedWhitespaceGapCount(plan) {
  const connecting = new Set(['area', 'baseline', 'line']);
  return plan.plots.reduce((total, resource) => {
    if (!connecting.has(resource.kind)) return total;
    let count = 0;
    let index = 1;
    while (index < resource.points.length - 1) {
      if (resource.points[index].state !== 'whitespace'
        || resource.points[index - 1].state !== 'value') {
        index += 1;
        continue;
      }
      while (index < resource.points.length && resource.points[index].state === 'whitespace') {
        index += 1;
      }
      if (index < resource.points.length && resource.points[index].state === 'value') count += 1;
    }
    return total + count;
  }, 0);
}

/** Close adapter paint evidence over logical values so no native handle can escape a receipt. */
export function readCalculatedSeriesPaintedReadback(value, plan) {
  exactRecord(value, [
    'candleInvariant', 'logicalResourceCount', 'matchedColorPixels', 'nativePlotSeries', 'paneCount',
    'regions', 'retainedHandles', 'resourceIds', 'whitespaceGaps',
  ]);
  if (value.candleInvariant !== true
    || safeCount(value.logicalResourceCount) !== plan.resourceCount) fail();
  const expectedResourceIds = [
    ...plan.plots, ...plan.bands, ...plan.referenceLines,
  ].map(({ resourceId }) => resourceId).sort();
  const expectedRegions = plan.regions.map(({ regionId }) => regionId);
  const retained = exactRecord(value.retainedHandles, [
    'bands', 'plots', 'referenceLines', 'regions', 'scales',
  ]);
  const ceilings = {
    bands: plan.bands.length,
    plots: plan.plots.length,
    referenceLines: plan.referenceLines.length,
    regions: plan.regions.length,
    scales: plan.scales.length,
  };
  const retainedHandles = Object.freeze(Object.fromEntries(
    Object.keys(ceilings).map((key) => {
      const count = safeCount(retained[key]);
      if (count > ceilings[key]) fail();
      return [key, count];
    }),
  ));
  const paneCount = safeCount(value.paneCount);
  if (paneCount < plan.regions.length) fail();
  const expectedNativePlotSeries = plan.plots.reduce((count, plot) => (
    count + plot.nativeSeriesCount
  ), 0);
  if (safeCount(value.nativePlotSeries) !== expectedNativePlotSeries) fail();
  const whitespace = exactRecord(value.whitespaceGaps, [
    'bridgePixelCount', 'checkedProbeCount', 'gapCount',
  ]);
  const gapCount = expectedWhitespaceGapCount(plan);
  if (safeCount(whitespace.gapCount) !== gapCount
    || safeCount(whitespace.checkedProbeCount) !== gapCount * 2) fail();
  return Object.freeze({
    candleInvariant: true,
    logicalResourceCount: plan.resourceCount,
    matchedColorPixels: safeCount(value.matchedColorPixels),
    nativePlotSeries: expectedNativePlotSeries,
    paneCount,
    regions: exactStringArray(value.regions, expectedRegions),
    retainedHandles,
    resourceIds: exactStringArray(value.resourceIds, expectedResourceIds),
    whitespaceGaps: Object.freeze({
      bridgePixelCount: safeCount(whitespace.bridgePixelCount),
      checkedProbeCount: gapCount * 2,
      gapCount,
    }),
  });
}
