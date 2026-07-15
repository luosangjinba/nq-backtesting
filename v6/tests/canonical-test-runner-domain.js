import { TEST_ENVIRONMENTS } from './canonical-test-manifest.js';

export function selectCanonicalGateScripts(manifest, { environment = 'all' } = {}) {
  if (environment !== 'all' && !TEST_ENVIRONMENTS.includes(environment)) {
    throw new Error(`Unsupported canonical test environment: ${environment}`);
  }

  return Object.freeze(manifest.suites
    .filter((suite) => suite.role === 'gate')
    .filter((suite) => environment === 'all' || suite.environment === environment)
    .flatMap((suite) => suite.scripts.map((script) => Object.freeze({
      environment: suite.environment,
      script,
      suiteId: suite.id,
    }))));
}
