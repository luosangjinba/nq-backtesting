function method(value, name, label) {
  if (typeof value?.[name] !== 'function') {
    throw new TypeError(`${label} requires ${name}().`);
  }
  return value[name].bind(value);
}

function requireConfiguration(value) {
  if (value === null) return null;
  if (!value || !Array.isArray(value.registrations) || typeof value.idFactory !== 'function'
    || typeof value.readProfileSnapshot !== 'function' || !value.storage) {
    throw new TypeError('Calculated-series workflow configuration is invalid.');
  }
  method(value.runtimeApi, 'createCalculatedSeriesRuntime', 'Calculated-series runtime API');
  method(value.executionApi, 'createTrustedCalculatedSeriesExecutionAdapter', 'Trusted execution API');
  method(value.persistenceApi, 'createCalculatedSeriesPersistenceAdapter', 'Calculated-series persistence API');
  method(value.uiApi, 'createCalculatedSeriesUi', 'Calculated-series UI API');
  return value;
}

/**
 * Compose removable package-neutral Indicator owners around the existing sole
 * Chart participant. This workflow owns no formula, DOM, native surface, or bytes.
 */
export function createWorkspaceCalculatedSeriesWorkflow({
  configuration: rawConfiguration,
  paneAddonPort,
  record,
}) {
  const configuration = requireConfiguration(rawConfiguration);
  if (configuration === null) return null;
  const persistence = configuration.persistenceApi.createCalculatedSeriesPersistenceAdapter({
    storage: configuration.storage,
  });
  const execution = configuration.executionApi.createTrustedCalculatedSeriesExecutionAdapter();
  const runtime = configuration.runtimeApi.createCalculatedSeriesRuntime({
    activationGeneration: record.activationGeneration,
    crypto: configuration.crypto,
    execution,
    idFactory: configuration.idFactory,
    persistence,
    readProfileSnapshot: configuration.readProfileSnapshot,
    registrations: configuration.registrations,
    sessionId: record.sessionId,
  });
  let disposed = false;
  let startPromise = null;
  let ui = null;

  function start() {
    if (disposed) throw new TypeError('Calculated-series workflow is disposed.');
    if (startPromise !== null) return startPromise;
    startPromise = Promise.resolve(runtime.initialize()).then((snapshot) => {
      ui = configuration.uiApi.createCalculatedSeriesUi({ paneAddonPort, runtime });
      return snapshot;
    });
    return startPromise;
  }

  const workspacePort = Object.freeze({
    acceptWorkspaceSurface: runtime.acceptWorkspaceSurface,
    async prepareWorkspaceSurface(input) {
      await start();
      return runtime.prepareWorkspaceSurface(input);
    },
    rollbackWorkspaceSurface: runtime.rollbackWorkspaceSurface,
  });

  return Object.freeze({
    bindChartAdapter(adapter) {
      runtime.bindChartPort(Object.freeze({
        prepare: (paneId, candidate) => adapter.prepareCalculatedSeries(paneId, candidate),
        snapshot: (paneId) => adapter.calculatedSeriesSnapshot(paneId),
      }));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      ui?.dispose();
      ui = null;
      runtime.dispose();
    },
    snapshot() {
      return Object.freeze({ runtime: runtime.snapshot(), ui: ui?.snapshot() ?? null });
    },
    start,
    workspaceParticipant: Object.freeze({
      id: 'calculated-series-document',
      async prepare(input) {
        await start();
        return runtime.prepareWorkspaceTransaction(input);
      },
    }),
    workspacePort,
  });
}
