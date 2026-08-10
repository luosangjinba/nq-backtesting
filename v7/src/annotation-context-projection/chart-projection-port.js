import { failContextProjection } from './context-projection-error.js';

const METHODS = Object.freeze(['apply', 'finalize', 'prepareReconciliation', 'rollback']);

export function requireChartProjectionPort(candidate) {
  if (!candidate || typeof candidate !== 'object'
    || METHODS.some((method) => typeof candidate[method] !== 'function')) {
    failContextProjection(
      'CONTEXT_PROJECTION_CHART_PORT_INVALID',
      'Mounted Pane requires one bounded Chart Annotation projection port.',
    );
  }
  return candidate;
}
