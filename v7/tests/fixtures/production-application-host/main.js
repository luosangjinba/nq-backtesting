import { createModuleHost } from '../../../src/module-host/public.js';
import { loadProductionApplicationDefinitions } from '../../../app/production-module-catalog.js';
import { readProductionProductModuleOmissions } from '../../../app/production-product-policy.js';

function createMemoryStorage() {
  const values = new Map();
  return Object.freeze({
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.has(String(key)) ? values.get(String(key)) : null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(String(key)),
    setItem: (key, value) => values.set(String(key), String(value)),
  });
}

function sessionEnvironment(root) {
  const storage = createMemoryStorage();
  return Object.freeze({
    browserWindow: window,
    crypto: window.crypto,
    readStorage: () => storage,
    root,
  });
}

function fakeMaintenanceClient() {
  return Object.freeze({
    apiBase: 'fixture',
    async request({ action }) {
      if (action === 'coverage_status') return { ok: true, coverage: [] };
      if (action === 'environment_status') return { ok: true, environment: [] };
      if (action === 'roll_health') return { ok: true, rollHealth: [] };
      if (action === 'job_status') return { ok: false, output: 'No retained data maintenance job is available.' };
      return { ok: true };
    },
    async runJob() { return { ok: true, output: 'fixture' }; },
    async verifyV7Read() { return { returnedBars: 1 }; },
    async watchJob() { return { ok: true, output: 'fixture' }; },
  });
}

function failureProbe() {
  return Object.freeze({
    descriptor: Object.freeze({
      id: 'optional.partial-start-probe',
      version: '1.0.0',
      kind: 'optional',
      owner: 'test-governance',
      publicEntry: 'tests/fixtures/production-application-host/main.js',
      requiredPorts: ['adapter.session-application'],
      optionalPorts: [],
      lifecycle: ['start', 'stop', 'dispose'],
      independentHarness: 'tests/production-application-host-browser-harness.js',
      removable: true,
    }),
    instantiate() {
      return Object.freeze({
        publicApi: Object.freeze({}),
        async start() { throw new Error('intentional post-application start failure'); },
        async stop() {},
        async dispose() {},
      });
    },
  });
}

async function run() {
  location.hash = '#/sessions';
  const traceOne = [];
  const definitionsOne = await loadProductionApplicationDefinitions({
    environment: sessionEnvironment(document.querySelector('#host-one')),
    lifecycleObserver: (event, moduleId, details = null) => traceOne.push({ details, event, moduleId }),
    rootModuleId: 'adapter.session-application',
  });
  const definitionsTwo = await loadProductionApplicationDefinitions({
    environment: sessionEnvironment(document.querySelector('#host-two')),
    rootModuleId: 'adapter.session-application',
  });
  const hostOne = createModuleHost(definitionsOne);
  const hostTwo = createModuleHost(definitionsTwo);
  await hostOne.start();
  await hostTwo.start();
  await new Promise((resolve) => queueMicrotask(resolve));
  const apiOne = hostOne.getPublicApi('adapter.session-application');
  const apiTwo = hostTwo.getPublicApi('adapter.session-application');
  const isolationBefore = Object.freeze({ one: apiOne.snapshot(), two: apiTwo.snapshot() });
  await hostOne.stop();
  const isolationAfterFirstStop = Object.freeze({
    one: apiOne.snapshot(),
    oneChildren: document.querySelector('#host-one').childElementCount,
    two: apiTwo.snapshot(),
    twoChildren: document.querySelector('#host-two').childElementCount,
  });
  await hostTwo.stop();

  const optionalTrace = [];
  const optionalDefinitions = await loadProductionApplicationDefinitions({
    environment: sessionEnvironment(document.querySelector('#host-optional')),
    lifecycleObserver: (event, moduleId, details = null) => optionalTrace.push({ details, event, moduleId }),
    omittedModuleIds: ['adapter.replay-workspace-ui'],
    rootModuleId: 'adapter.session-application',
  });
  const optionalHost = createModuleHost(optionalDefinitions);
  const optionalStarted = await optionalHost.start();
  const optionalApi = optionalHost.getPublicApi('adapter.session-application');
  const optionalSnapshot = optionalApi.snapshot();
  const sessionBrowserRegistration = optionalTrace.find(({ event, moduleId }) => (
    event === 'instantiate' && moduleId === 'adapter.session-browser-ui'
  ));
  await optionalHost.stop();

  const stateSyncOptionalDefinitions = await loadProductionApplicationDefinitions({
    environment: sessionEnvironment(document.querySelector('#host-optional')),
    omittedModuleIds: ['adapter.server-state-sync'],
    rootModuleId: 'adapter.session-application',
  });
  const stateSyncOptionalHost = createModuleHost(stateSyncOptionalDefinitions);
  const stateSyncOptionalStarted = await stateSyncOptionalHost.start();
  const stateSyncOptionalSnapshot = stateSyncOptionalHost
    .getPublicApi('adapter.session-application').snapshot();
  await stateSyncOptionalHost.stop();

  const campaignOptionalDefinitions = await loadProductionApplicationDefinitions({
    environment: sessionEnvironment(document.querySelector('#host-optional')),
    omittedModuleIds: readProductionProductModuleOmissions('adapter.session-application'),
    rootModuleId: 'adapter.session-application',
  });
  const campaignOptionalHost = createModuleHost(campaignOptionalDefinitions);
  const campaignOptionalStarted = await campaignOptionalHost.start();
  const campaignOptionalSnapshot = campaignOptionalHost
    .getPublicApi('adapter.session-application').snapshot();
  const campaignOptionalRail = [...document.querySelectorAll('#host-optional .rail-link')]
    .map((node) => node.textContent.trim());
  await campaignOptionalHost.stop();

  const dataDefinitions = await loadProductionApplicationDefinitions({
    environment: {
      root: document.querySelector('#host-data'),
      surfaceOptions: { client: fakeMaintenanceClient() },
    },
    rootModuleId: 'adapter.data-acquisition-application',
  });
  const dataHost = createModuleHost(dataDefinitions);
  await dataHost.start();
  const dataApi = dataHost.getPublicApi('adapter.data-acquisition-application');
  const dataRunning = dataApi.snapshot();
  await dataHost.stop();
  const dataStopped = dataApi.snapshot();

  const dataBootstrapOptionalDefinitions = await loadProductionApplicationDefinitions({
    environment: {
      root: document.querySelector('#host-data'),
      surfaceOptions: { client: fakeMaintenanceClient() },
    },
    omittedModuleIds: ['adapter.database-bootstrap-ui'],
    rootModuleId: 'adapter.data-acquisition-application',
  });
  const dataBootstrapOptionalHost = createModuleHost(dataBootstrapOptionalDefinitions);
  const dataBootstrapOptionalStarted = await dataBootstrapOptionalHost.start();
  const dataBootstrapOptionalSnapshot = dataBootstrapOptionalHost
    .getPublicApi('adapter.data-acquisition-application').snapshot();
  const dataBootstrapPanelPresent = document.querySelector('#databaseImportTitle') !== null;
  await dataBootstrapOptionalHost.stop();

  const rollbackTrace = [];
  const rollbackDefinitions = await loadProductionApplicationDefinitions({
    environment: sessionEnvironment(document.querySelector('#host-rollback')),
    lifecycleObserver: (event, moduleId) => rollbackTrace.push({ event, moduleId }),
    rootModuleId: 'adapter.session-application',
  });
  const rollbackHost = createModuleHost([...rollbackDefinitions, failureProbe()]);
  let rollbackFailureCode = null;
  try { await rollbackHost.start(); } catch (error) { rollbackFailureCode = error.code; }

  const missingRequiredDefinitions = await loadProductionApplicationDefinitions({
    environment: sessionEnvironment(document.createElement('main')),
    omittedModuleIds: ['adapter.session-browser-ui'],
    rootModuleId: 'adapter.session-application',
  });
  let requiredOmissionFailureCode = null;
  try { createModuleHost(missingRequiredDefinitions); } catch (error) {
    requiredOmissionFailureCode = error.code;
  }

  return Object.freeze({
    campaignOptional: Object.freeze({
      moduleIds: campaignOptionalStarted.moduleIds,
      rail: campaignOptionalRail,
      snapshot: campaignOptionalSnapshot,
    }),
    data: Object.freeze({
      childrenAfterStop: document.querySelector('#host-data').childElementCount,
      running: dataRunning,
      stopped: dataStopped,
    }),
    dataBootstrapOptional: Object.freeze({
      moduleIds: dataBootstrapOptionalStarted.moduleIds,
      panelPresent: dataBootstrapPanelPresent,
      snapshot: dataBootstrapOptionalSnapshot,
    }),
    isolationAfterFirstStop,
    isolationBefore,
    optional: Object.freeze({
      moduleIds: optionalStarted.moduleIds,
      sessionBrowserOptionalPortIds: sessionBrowserRegistration?.details?.optionalPortIds ?? null,
      snapshot: optionalSnapshot,
    }),
    reverseCleanup: Object.freeze(traceOne.filter(({ event }) => event === 'stop' || event === 'dispose')),
    rollback: Object.freeze({
      children: document.querySelector('#host-rollback').childElementCount,
      failureCode: rollbackFailureCode,
      status: rollbackHost.snapshot().status,
      trace: rollbackTrace,
    }),
    requiredOmissionFailureCode,
    stateSyncOptional: Object.freeze({
      moduleIds: stateSyncOptionalStarted.moduleIds,
      snapshot: stateSyncOptionalSnapshot,
    }),
    status: 'passed',
  });
}

globalThis.__productionApplicationHostEvidence = Object.freeze({ status: 'running' });
run().then(
  (evidence) => { globalThis.__productionApplicationHostEvidence = evidence; },
  (error) => {
    globalThis.__productionApplicationHostEvidence = Object.freeze({
      message: error?.stack ?? String(error),
      status: 'failed',
    });
  },
);
