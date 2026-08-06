const MODULE_ID = 'adapter.data-acquisition-application';

/**
 * Owner: application-composition.
 * Adapts the Data Acquisition surface to one real ModuleHost lifecycle. The
 * DOM surface is acquired only in start and is disposed during both rollback
 * and normal host cleanup.
 */
export function createProductionModuleDefinition({
  descriptor,
  environment,
  lifecycleObserver = () => {},
}) {
  if (descriptor?.id !== MODULE_ID) throw new TypeError(`Expected ${MODULE_ID} descriptor.`);
  if (!environment?.root) throw new TypeError(`${MODULE_ID} requires a root.`);
  return Object.freeze({
    descriptor,
    instantiate({ optionalPorts, requiredPorts }) {
      lifecycleObserver('instantiate', MODULE_ID);
      const surfaceApi = requiredPorts['adapter.data-acquisition-ui'];
      if (!surfaceApi || typeof surfaceApi.createDataAcquisitionSurface !== 'function') {
        throw new TypeError(`${MODULE_ID} requires adapter.data-acquisition-ui.`);
      }
      let status = 'created';
      let surface = null;
      const snapshot = () => Object.freeze({ hasSurface: surface !== null, status });
      function cleanup(nextStatus) {
        const released = surface;
        surface = null;
        status = nextStatus;
        released?.dispose();
      }
      return Object.freeze({
        publicApi: Object.freeze({ snapshot }),
        async start() {
          lifecycleObserver('start', MODULE_ID);
          status = 'starting';
          surface = surfaceApi.createDataAcquisitionSurface({
            ...(environment.surfaceOptions ?? {}),
            databaseBootstrapApi: optionalPorts['adapter.database-bootstrap-ui'] ?? null,
            root: environment.root,
          });
          status = 'running';
          return snapshot();
        },
        async stop() {
          lifecycleObserver('stop', MODULE_ID);
          if (status !== 'disposed') cleanup('stopped');
        },
        async dispose() {
          lifecycleObserver('dispose', MODULE_ID);
          if (status !== 'disposed') cleanup('disposed');
        },
      });
    },
  });
}
