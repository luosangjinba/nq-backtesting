import { SESSION_BROWSER_CONFIG } from './config.js';
import { createHashNavigation } from './hash-navigation.js';
import { requireApplicationPort, SESSION_APPLICATION_MODULE_ID } from './application-ports.js';
import { composeSessionApplicationStores } from './application-stores.js';

async function releaseResources({
  browser, packageBrowser, packageStore, pluginProfile, replayWorkspace, stateSync,
}) {
  const errors = [];
  try { browser?.dispose(); } catch (error) { errors.push(error); }
  try { await replayWorkspace?.dispose(); } catch (error) { errors.push(error); }
  try { packageBrowser?.dispose(); } catch (error) { errors.push(error); }
  try { packageStore?.dispose(); } catch (error) { errors.push(error); }
  try { pluginProfile?.dispose(); } catch (error) { errors.push(error); }
  try { await stateSync?.dispose(); } catch (error) { errors.push(error); }
  if (errors.length > 0) throw new AggregateError(errors, 'Session application cleanup failed.');
}

function validateOptionalPorts(optionalPorts) {
  const replayApi = optionalPorts['adapter.replay-workspace-ui'] ?? null;
  const pluginCenterApi = optionalPorts['adapter.plugin-center-ui'] ?? null;
  const annotationWorkflowApi = optionalPorts['optional.annotation-manual-workflow'] ?? null;
  const stateSyncApi = optionalPorts['adapter.server-state-sync'] ?? null;
  if (replayApi && typeof replayApi.createReplayWorkspaceSurface !== 'function') {
    throw new TypeError(`${SESSION_APPLICATION_MODULE_ID} received an invalid optional Replay Workspace port.`);
  }
  if (pluginCenterApi && (typeof pluginCenterApi.createCorePluginCenterControl !== 'function'
    || typeof pluginCenterApi.createLocalPluginPackageBrowserAdapter !== 'function'
    || typeof pluginCenterApi.createPluginCenterWorkspaceControl !== 'function')) {
    throw new TypeError(`${SESSION_APPLICATION_MODULE_ID} received an invalid optional Plugin Center port.`);
  }
  if (stateSyncApi && typeof stateSyncApi.createServerStateSync !== 'function') {
    throw new TypeError(`${SESSION_APPLICATION_MODULE_ID} received an invalid optional State Sync port.`);
  }
  if (annotationWorkflowApi
    && typeof annotationWorkflowApi.createProductionManualAnnotationWorkflow !== 'function') {
    throw new TypeError(`${SESSION_APPLICATION_MODULE_ID} received an invalid Annotation Workflow port.`);
  }
  return Object.freeze({ annotationWorkflowApi, pluginCenterApi, replayApi, stateSyncApi });
}

/** Own all browser resources acquired by one hosted Session application instance. */
export function createSessionApplicationResources({
  browserApi,
  dateApi,
  environment,
  lifecycleObserver,
  optionalPorts,
  pluginProfileApi,
  requiredPorts,
}) {
  const optional = validateOptionalPorts(optionalPorts);
  let browser = null;
  let packageBrowser = null;
  let packageStore = null;
  let pluginProfile = null;
  let replayWorkspace = null;
  let stateSync = null;
  let status = 'created';
  let storageAvailable = false;

  function snapshot() {
    return Object.freeze({
      hasBrowser: browser !== null,
      hasCorePluginProfile: pluginProfile !== null,
      hasReplayWorkspace: replayWorkspace !== null,
      status,
      storageAvailable,
    });
  }

  function profileOptions(storage) {
    return {
      idFactory: () => environment.crypto.randomUUID(),
      moduleDescriptors: environment.productionModuleCatalogDescriptors
        ?? environment.productionModuleDescriptors,
      plan: environment.corePluginBoot.plan,
      readModuleHostSnapshot: environment.readModuleHostSnapshot,
      storage,
    };
  }

  function initializePluginProfile() {
    let rawStorage = null;
    let profileStorage = null;
    let failure = null;
    try {
      rawStorage = environment.readStorage();
      profileStorage = requireApplicationPort(
        requiredPorts, 'adapter.session-persistence', 'createStorageAdapter',
      ).createStorageAdapter(rawStorage);
    } catch (error) { failure = error; }
    if (profileStorage === null && environment.corePluginBoot.candidate.source === 'pending') throw failure;
    pluginProfile = pluginProfileApi.createCorePluginProfileRuntime(
      profileOptions(profileStorage),
    );
    pluginProfile.initializeBoot(environment.corePluginBoot);
    return rawStorage;
  }

  async function initializeStores(rawStorage) {
    if (rawStorage === null) return null;
    let storage = rawStorage;
    if (optional.stateSyncApi && typeof environment.fetch === 'function'
      && typeof environment.reload === 'function') {
      stateSync = optional.stateSyncApi.createServerStateSync({
        crypto: environment.crypto,
        fetch: environment.fetch,
        now: () => Date.now(),
        reload: environment.reload,
        storage,
      });
      await stateSync.initialize();
      storage = stateSync.storage;
    }
    return composeSessionApplicationStores({ ports: requiredPorts, storage });
  }

  async function initializeLocalPackages() {
    if (!optional.pluginCenterApi) return;
    const storageApi = requireApplicationPort(
      requiredPorts, 'adapter.plugin-package-storage', 'createIndexedDbPluginPackageStorage',
    );
    const storeApi = requireApplicationPort(
      requiredPorts, 'core.plugin-package-store', 'createPluginPackageStoreRuntime',
    );
    const packageStorage = storageApi.createIndexedDbPluginPackageStorage({
      indexedDB: environment.browserWindow.indexedDB,
    });
    packageStore = storeApi.createPluginPackageStoreRuntime({
      cryptoPort: environment.crypto,
      idFactory: () => `package-${environment.crypto.randomUUID()}`,
      storage: packageStorage,
    });
    await packageStore.initialize();
    packageBrowser = optional.pluginCenterApi.createLocalPluginPackageBrowserAdapter({
      cryptoPort: environment.crypto,
    });
  }

  function createPluginCenterFactory() {
    if (!optional.pluginCenterApi || !pluginProfile) return null;
    if (!packageBrowser || !packageStore) {
      return () => optional.pluginCenterApi.createCorePluginCenterControl({
        onRestart: restartApplication,
        profile: pluginProfile,
      });
    }
    return () => optional.pluginCenterApi.createPluginCenterWorkspaceControl({
      browser: packageBrowser,
      idFactory: () => `command-${environment.crypto.randomUUID()}`,
      onRestart: (receipt) => {
        restartApplication(receipt);
      },
      profile: pluginProfile,
      store: packageStore,
    });
  }

  function restartApplication(receipt) {
    pluginProfile.validateRestartReceipt(receipt);
    if (typeof environment.reload !== 'function') {
      throw new Error('Application restart is unavailable in this host.');
    }
    environment.reload();
  }

  function createReplayWorkspace(composed) {
    if (!optional.replayApi) return null;
    const annotationReady = optional.annotationWorkflowApi && composed
      && Array.isArray(environment.productionModuleDescriptors)
      && typeof environment.readModuleHostSnapshot === 'function';
    return optional.replayApi.createReplayWorkspaceSurface({
      annotationWorkflow: annotationReady ? Object.freeze({
        api: optional.annotationWorkflowApi,
        idFactory: () => environment.crypto.randomUUID(),
        moduleDescriptors: environment.productionModuleDescriptors,
        nowEpochMs: () => Date.now(),
        readModuleHostSnapshot: environment.readModuleHostSnapshot,
        storage: composed.storage,
      }) : null,
      pluginCenter: createPluginCenterFactory(),
    });
  }

  function createBrowser(composed, unavailableMessage) {
    return browserApi.createSessionBrowser({
      colorHistory: composed?.colorHistory ?? null,
      dateAvailability: dateApi.createMarketDateAvailability(),
      idFactory: () => `session-${environment.crypto.randomUUID()}`,
      instruments: SESSION_BROWSER_CONFIG.instruments,
      navigation: createHashNavigation(environment.browserWindow),
      openedSessionSurface: composed ? replayWorkspace : null,
      replayNavigationPreferences: composed?.replayNavigationPreferences ?? null,
      root: environment.root,
      stateSync,
      store: composed?.sessionStore ?? null,
      unavailableMessage,
      workstationSettings: composed?.workstationSettings ?? null,
    });
  }

  async function start() {
    lifecycleObserver('start', SESSION_APPLICATION_MODULE_ID);
    status = 'starting';
    const rawStorage = initializePluginProfile();
    let composed = null;
    try { composed = await initializeStores(rawStorage); } catch { composed = null; }
    storageAvailable = composed !== null;
    await initializeLocalPackages();
    const unavailableMessage = composed ? null
      : 'Local Session storage could not be initialized. Check browser site-data permissions and reload.';
    replayWorkspace = createReplayWorkspace(composed);
    browser = createBrowser(composed, unavailableMessage);
    browser.start();
    pluginProfile.acceptApplicationReady();
    status = 'running';
    return snapshot();
  }

  async function cleanup(nextStatus) {
    const resources = {
      browser, packageBrowser, packageStore, pluginProfile, replayWorkspace, stateSync,
    };
    browser = null;
    packageBrowser = null;
    packageStore = null;
    pluginProfile = null;
    replayWorkspace = null;
    stateSync = null;
    storageAvailable = false;
    status = nextStatus;
    await releaseResources(resources);
  }

  return Object.freeze({
    async dispose() {
      lifecycleObserver('dispose', SESSION_APPLICATION_MODULE_ID);
      if (status !== 'disposed') await cleanup('disposed');
    },
    snapshot,
    start,
    async stop() {
      lifecycleObserver('stop', SESSION_APPLICATION_MODULE_ID);
      if (status !== 'disposed') await cleanup('stopped');
    },
  });
}
