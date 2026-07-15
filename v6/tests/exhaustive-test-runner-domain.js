import { TEST_ENVIRONMENTS } from './canonical-test-manifest.js';

export function selectExhaustiveGateScripts(catalog, { environment = 'node' } = {}) {
  if (environment !== 'all' && !TEST_ENVIRONMENTS.includes(environment)) {
    throw new Error(`Unsupported exhaustive test environment: ${environment}`);
  }

  return Object.freeze(catalog
    .filter((entry) => entry.role === 'gate')
    .filter((entry) => environment === 'all' || entry.environment === environment)
    .map((entry) => Object.freeze({
      environment: entry.environment,
      script: entry.path,
    })));
}
