import { failChartApplication } from './application-error.js';

function requireMethod(port, name) {
  if (!port || typeof port[name] !== 'function') {
    failChartApplication('CHART_ADAPTER_PORT_INVALID', `Chart adapter must provide ${name}().`);
  }
}

/** Validate the only stateful chart-series writer injected into the application. */
export function requireChartAdapter(port) {
  for (const method of ['stage', 'applyVisible', 'rollbackVisible', 'finalizeVisible']) {
    requireMethod(port, method);
  }
  return port;
}
