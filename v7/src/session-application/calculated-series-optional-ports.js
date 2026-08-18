const MODULE_ID = 'adapter.session-application';

function requireMethod(value, name, label) {
  if (value && typeof value[name] !== 'function') {
    throw new TypeError(`${MODULE_ID} received an invalid ${label}.`);
  }
}

/** Validate the all-removable calculated-series application port group. */
export function validateCalculatedSeriesOptionalPorts(optionalPorts) {
  const runtimeApi = optionalPorts['optional.calculated-series-runtime'] ?? null;
  const executionApi = optionalPorts['adapter.trusted-calculated-series-execution'] ?? null;
  const persistenceApi = optionalPorts['adapter.calculated-series-persistence'] ?? null;
  const uiApi = optionalPorts['optional.calculated-series-ui'] ?? null;
  const movingAveragesApi = optionalPorts['optional.core-moving-averages'] ?? null;
  requireMethod(runtimeApi, 'createCalculatedSeriesRuntime', 'calculated-series runtime');
  requireMethod(executionApi, 'createTrustedCalculatedSeriesExecutionAdapter', 'trusted execution adapter');
  requireMethod(persistenceApi, 'createCalculatedSeriesPersistenceAdapter', 'calculated-series persistence adapter');
  requireMethod(uiApi, 'createCalculatedSeriesUi', 'calculated-series UI');
  requireMethod(movingAveragesApi, 'createMovingAveragesRegistration', 'Moving Averages package');
  requireMethod(movingAveragesApi, 'readTrustedCalculatedSeriesRegistration', 'Moving Averages package');
  return Object.freeze({
    calculatedSeriesExecutionApi: executionApi,
    calculatedSeriesPersistenceApi: persistenceApi,
    calculatedSeriesReady: [runtimeApi, executionApi, persistenceApi, uiApi].every(Boolean),
    calculatedSeriesRuntimeApi: runtimeApi,
    calculatedSeriesUiApi: uiApi,
    movingAveragesApi,
  });
}

/** Create the removable Replay surface configuration without leaking package authority. */
export function createCalculatedSeriesSurfaceConfiguration({
  composed,
  environment,
  optional,
  pluginProfile,
}) {
  if (!optional.calculatedSeriesReady || !composed) return null;
  const registrations = optional.movingAveragesApi ? Object.freeze([Object.freeze({
    read: optional.movingAveragesApi.readTrustedCalculatedSeriesRegistration,
    registration: optional.movingAveragesApi.createMovingAveragesRegistration(),
  })]) : Object.freeze([]);
  return Object.freeze({
    crypto: environment.crypto,
    executionApi: optional.calculatedSeriesExecutionApi,
    idFactory: () => environment.crypto.randomUUID(),
    persistenceApi: optional.calculatedSeriesPersistenceApi,
    readProfileSnapshot: pluginProfile.snapshot,
    registrations,
    runtimeApi: optional.calculatedSeriesRuntimeApi,
    storage: composed.storageAdapter,
    uiApi: optional.calculatedSeriesUiApi,
  });
}
