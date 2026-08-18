import {
  nativePlotPointSegments,
  nativePlotSeriesCount,
} from './calculated-series-native-plot-segments.js';
import {
  nativePlotData,
  nativePlotDefinition,
  nativePlotOptions,
} from './calculated-series-native-options.js';

function unprovenNativeMutation(message, cause) {
  return Object.assign(new Error(message), { cause, recoveryUnproven: true });
}

function regionIndex(chart, record) {
  return chart.panes().findIndex((pane) => pane === record.pane);
}

function removePlotSeries(chart, series) {
  [...series].reverse().forEach((entry) => chart.removeSeries(entry));
}

function createPlotSeries(chart, plan, region, scale) {
  const series = [];
  const segments = nativePlotPointSegments(plan);
  for (let index = 0; index < segments.length; index += 1) {
    try {
      series.push(chart.addSeries(
        nativePlotDefinition(plan.kind),
        nativePlotOptions(plan, scale.nativeScaleId, {
          title: index === segments.length - 1 ? plan.title : '',
        }),
        regionIndex(chart, region),
      ));
    } catch (cause) {
      const failures = [cause];
      try { removePlotSeries(chart, series); } catch (error) { failures.push(error); }
      throw unprovenNativeMutation(
        'Native Plot creation is unprovable.',
        failures.length === 1 ? cause : new AggregateError(failures),
      );
    }
  }
  return series;
}

function createPlot(chart, plan, region, scale) {
  const series = createPlotSeries(chart, plan, region, scale);
  try {
    const record = { plan, series };
    updateCalculatedSeriesPlot(record, plan, scale);
    return record;
  } catch (cause) {
    try {
      removePlotSeries(chart, series);
    } catch (cleanupCause) {
      throw unprovenNativeMutation(
        'Native Plot cleanup is unprovable.',
        new AggregateError([cause, cleanupCause]),
      );
    }
    throw cause;
  }
}

/** Flatten private native Series handles without exposing them outside the Chart adapter. */
export function calculatedSeriesPlotHandles(records) {
  return [...records].flatMap(({ series }) => series);
}

/** Count native built-in Series beneath the retained logical Plot records. */
export function calculatedSeriesNativePlotCount(records) {
  return [...records].reduce((count, record) => count + record.series.length, 0);
}

/** Apply one logical Plot plan to its fixed adapter-private segment-handle set. */
export function updateCalculatedSeriesPlot(record, plan, scale) {
  const segments = nativePlotPointSegments(plan);
  if (segments.length !== record.series.length
    || nativePlotSeriesCount(plan) !== plan.nativeSeriesCount) {
    throw new Error('Native Plot segment topology differs from its prepared resource plan.');
  }
  record.series.forEach((series, index) => {
    series.applyOptions(nativePlotOptions(plan, scale.nativeScaleId, {
      title: index === segments.length - 1 ? plan.title : '',
    }));
    series.setData(nativePlotData(plan, segments[index]));
  });
  record.plan = plan;
}

/** Reconcile logical Plots while replacing only records whose native segment topology changed. */
export function reconcileCalculatedSeriesPlots(chart, plan, previous, candidate, created) {
  for (const value of plan.plots) {
    const scale = candidate.scales.get(value.scaleGroupId);
    const region = candidate.regions.get(value.regionId);
    const prior = previous.plots.get(value.resourceId);
    const retained = prior
      && ['kind', 'regionId', 'scaleGroupId'].every((field) => prior.plan[field] === value[field])
      && prior.plan.nativeSeriesCount === value.nativeSeriesCount
      && previous.scales.get(value.scaleGroupId) === scale;
    const record = retained ? prior : createPlot(chart, value, region, scale);
    if (!retained) created.plots.add(record);
    else updateCalculatedSeriesPlot(record, value, scale);
    candidate.plots.set(value.resourceId, record);
  }
}

/** Hide obsolete Plot segments reversibly until the outer Chart owner finalizes. */
export function hideObsoleteCalculatedSeriesPlots(previous, candidate) {
  const retained = new Set(candidate.plots.values());
  for (const record of previous.plots.values()) {
    if (!retained.has(record)) record.series.forEach((series) => series.applyOptions({ visible: false }));
  }
}

/** Destroy every native segment handle held by one obsolete logical Plot record. */
export function removeCalculatedSeriesPlot(chart, record) {
  removePlotSeries(chart, record.series);
}
