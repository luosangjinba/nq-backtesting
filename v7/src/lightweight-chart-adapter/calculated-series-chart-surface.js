import { failLightweightAdapter } from './adapter-error.js';
import {
  applyCalculatedSeriesResourcePlan,
  createEmptyCalculatedSeriesResourceMaps,
  disposeCalculatedSeriesResources,
  finalizeCalculatedSeriesResourceStage,
  rollbackCalculatedSeriesResourceStage,
} from './calculated-series-chart-resources.js';

function requirePlan(plan) {
  for (const field of ['bands', 'logicalStates', 'plots', 'referenceLines', 'regions', 'scales']) {
    if (!Array.isArray(plan?.[field])) {
      failLightweightAdapter('CALCULATED_SERIES_CHART_NATIVE_PLAN_INVALID', `Native plan requires ${field}.`);
    }
  }
  if (plan.regions.filter(({ kind }) => kind === 'main').length !== 1
    || plan.plots.some(({ kind }) => !['area', 'baseline', 'histogram', 'line'].includes(kind))) {
    failLightweightAdapter('CALCULATED_SERIES_CHART_NATIVE_PLAN_INVALID', 'Native plan topology is invalid.');
  }
  return plan;
}

/** Keep every Lightweight Charts calculated-series handle private to the existing adapter owner. */
export function createCalculatedSeriesChartSurface({
  candleSeries,
  chart,
  readPriceIncrement,
  requestFrame,
} = {}) {
  if (typeof chart?.addSeries !== 'function' || typeof candleSeries?.data !== 'function'
    || typeof readPriceIncrement !== 'function' || typeof requestFrame !== 'function') {
    failLightweightAdapter(
      'CALCULATED_SERIES_CHART_NATIVE_SURFACE_INVALID',
      'Calculated-series surface requires the mounted Chart, candle Series, and host ports.',
    );
  }
  let accepted = createEmptyCalculatedSeriesResourceMaps();
  let acceptedPlan = null;
  let active = null;
  let disposed = false;
  const overlayCounter = { value: 0 };

  function requireActive(stage, state = 'applied') {
    if (active !== stage || stage?.state !== state) {
      failLightweightAdapter(
        'CALCULATED_SERIES_CHART_NATIVE_STAGE_INVALID',
        'Calculated-series native stage is foreign or out of phase.',
      );
    }
  }

  async function rollback(stage) {
    requireActive(stage);
    try {
      rollbackCalculatedSeriesResourceStage(chart, candleSeries, stage, readPriceIncrement());
      active = null;
    } catch (cause) {
      throw Object.assign(new Error('Native calculated-series rollback is unprovable.'), {
        cause, recoveryUnproven: true,
      });
    }
  }

  return Object.freeze({
    async apply(planValue) {
      if (disposed) failLightweightAdapter('CHART_ADAPTER_DISPOSED', 'Chart adapter is disposed.');
      if (active !== null) {
        failLightweightAdapter('CALCULATED_SERIES_CHART_NATIVE_BUSY', 'Native surface already has an active stage.');
      }
      const plan = requirePlan(planValue);
      try {
        const result = await applyCalculatedSeriesResourcePlan({
          candleSeries,
          chart,
          current: accepted,
          overlayCounter,
          plan,
          priceIncrement: readPriceIncrement(),
          requestFrame,
        });
        active = result.stage;
        return result;
      } catch (cause) {
        const stage = cause?.nativeStage;
        if (stage) {
          try {
            rollbackCalculatedSeriesResourceStage(chart, candleSeries, stage, readPriceIncrement());
          } catch (rollbackCause) {
            throw Object.assign(new Error('Native apply restoration is unprovable.'), {
              cause: new AggregateError([cause, rollbackCause]), recoveryUnproven: true,
            });
          }
        }
        throw cause;
      }
    },
    async dispose() {
      if (disposed) return;
      if (active !== null) await rollback(active);
      disposeCalculatedSeriesResources(chart, accepted);
      accepted = createEmptyCalculatedSeriesResourceMaps();
      acceptedPlan = null;
      disposed = true;
    },
    async finalize(stage) {
      requireActive(stage);
      accepted = stage.candidate;
      acceptedPlan = stage.plan;
      active = null;
      try {
        finalizeCalculatedSeriesResourceStage(chart, stage);
      } catch (cause) {
        throw Object.assign(new Error('Native calculated-series finalize cleanup is unprovable.'), {
          cause, recoveryUnproven: true,
        });
      }
    },
    preflight(plan) {
      if (disposed) failLightweightAdapter('CHART_ADAPTER_DISPOSED', 'Chart adapter is disposed.');
      if (active !== null) {
        failLightweightAdapter('CALCULATED_SERIES_CHART_NATIVE_BUSY', 'Native surface already has an active stage.');
      }
      requirePlan(plan);
    },
    rollback,
    snapshot() {
      const visible = active?.candidate ?? accepted;
      return Object.freeze({
        accepted: acceptedPlan === null ? null : Object.freeze({
          logicalResourceCount: acceptedPlan.resourceCount,
          regionIds: Object.freeze(acceptedPlan.regions.map(({ regionId }) => regionId)),
        }),
        active: active === null ? null : active.state,
        disposed,
        nativeInventory: Object.freeze({
          bands: visible.bands.size,
          plots: visible.plots.size,
          referenceLines: visible.lines.size,
          regions: visible.regions.size,
          scales: visible.scales.size,
        }),
      });
    },
  });
}
