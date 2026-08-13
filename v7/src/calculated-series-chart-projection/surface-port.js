import { failCalculatedSeriesChartProjection } from './projection-error.js';
import {
  requireChartCalculatedSeriesProjectionControls,
} from '../chart-snapshot-application/public.js';

const METHODS = Object.freeze(['apply', 'dispose', 'finalize', 'preflight', 'rollback', 'snapshot']);

export function requireCalculatedSeriesChartSurface(candidate) {
  for (const method of METHODS) {
    if (typeof candidate?.[method] !== 'function') {
      failCalculatedSeriesChartProjection(
        'CALCULATED_SERIES_CHART_SURFACE_INVALID',
        `Calculated-series native surface requires ${method}().`,
      );
    }
  }
  return candidate;
}

export function requireChartOwnerControls(candidate) {
  return requireChartCalculatedSeriesProjectionControls(candidate);
}
