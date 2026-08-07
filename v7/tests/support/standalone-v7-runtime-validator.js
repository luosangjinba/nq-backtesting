function violation(code, detail = null) {
  return Object.freeze({ code, detail });
}

function values(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Validate the compact, observed contract for a standalone V7 runtime.
 *
 * This validator is intentionally independent from filesystem traversal. The
 * harness builds the observed contract from production sources, then negative
 * controls mutate that same contract and assert stable failure codes.
 */
export function validateStandaloneV7Runtime(contract) {
  const violations = [];
  const productionRoots = values(contract?.productionRoots);
  if (productionRoots.length === 0
    || productionRoots.some((root) => typeof root !== 'string' || !root.startsWith('v7/'))) {
    violations.push(violation('STANDALONE_V7_PRODUCTION_ROOT_INVALID'));
  }

  const marketService = contract?.marketService;
  if (marketService?.id !== 'service.v7-market-data'
    || marketService?.entry !== 'v7/server/market_data_api.py'
    || values(marketService?.ownedPaths).length === 0
    || values(marketService?.ownedPaths).some((entry) => !entry.startsWith('v7/server/market_data_'))) {
    violations.push(violation('STANDALONE_V7_MARKET_SERVICE_INVALID'));
  }

  const marketUnit = contract?.marketUnit;
  if (marketUnit?.component !== 'service.v7-market-data'
    || marketUnit?.unitName !== 'replay-lab-market-data.service'
    || marketUnit?.template !== 'v7/deploy/linux/systemd/replay-lab-market-data.service.template') {
    violations.push(violation('STANDALONE_V7_SERVICE_UNIT_INVALID'));
  }

  const marketRoute = contract?.marketRoute;
  if (marketRoute?.pathPattern !== '/v7/market-data/*'
    || marketRoute?.targetComponent !== 'service.v7-market-data'
    || marketRoute?.targetEndpoint !== '127.0.0.1:8766') {
    violations.push(violation('STANDALONE_V7_PROXY_ROUTE_INVALID'));
  }

  const dependency = contract?.regressionDependency;
  if (dependency?.healthPath !== '/v7/market-data/health'
    || dependency?.startEntry !== 'v7/server/market_data_api.py'
    || dependency?.databaseEnvironmentVariable !== 'V7_MARKET_DATA_DB') {
    violations.push(violation('STANDALONE_V7_REGRESSION_DEPENDENCY_INVALID'));
  }

  const releaseContract = contract?.releaseContract;
  if (JSON.stringify(values(releaseContract?.repositoryArchiveRoots)) !== JSON.stringify(['v7'])
    || releaseContract?.marketDatabase?.delivery !== 'external-file'
    || releaseContract?.marketDatabase?.environmentVariable !== 'V7_MARKET_DATA_DB'
    || releaseContract?.marketDatabase?.releaseContainsDatabase !== false
    || contract?.archiveCommandScopedToV7 !== true) {
    violations.push(violation('STANDALONE_V7_RELEASE_CONTRACT_INVALID'));
  }

  if (values(contract?.legacyTokenMatches).length > 0) {
    violations.push(violation(
      'STANDALONE_V7_ACTIVE_LEGACY_REFERENCE',
      values(contract.legacyTokenMatches).join('\n'),
    ));
  }
  return Object.freeze(violations);
}
