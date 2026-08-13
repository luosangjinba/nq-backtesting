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

/** Close adapter paint evidence over logical values so no native handle can escape a receipt. */
export function readCalculatedSeriesPaintedReadback(value, plan) {
  exactRecord(value, [
    'candleInvariant', 'logicalResourceCount', 'matchedColorPixels', 'paneCount',
    'regions', 'retainedHandles', 'resourceIds',
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
  return Object.freeze({
    candleInvariant: true,
    logicalResourceCount: plan.resourceCount,
    matchedColorPixels: safeCount(value.matchedColorPixels),
    paneCount,
    regions: exactStringArray(value.regions, expectedRegions),
    retainedHandles,
    resourceIds: exactStringArray(value.resourceIds, expectedResourceIds),
  });
}
