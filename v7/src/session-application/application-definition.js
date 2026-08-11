import {
  requireApplicationPort,
  SESSION_APPLICATION_MODULE_ID,
} from './application-ports.js';
import { createSessionApplicationResources } from './application-resources.js';

/**
 * Owner: application-composition.
 * Builds the real Session Browser application as one ModuleHost lifecycle
 * definition. Public module namespaces arrive only through registered ports;
 * DOM, navigation, and storage resources are acquired in start and released by
 * both partial-start rollback and normal reverse cleanup.
 */
export function createProductionModuleDefinition({
  descriptor,
  environment,
  lifecycleObserver = () => {},
}) {
  if (descriptor?.id !== SESSION_APPLICATION_MODULE_ID) {
    throw new TypeError(`Expected ${SESSION_APPLICATION_MODULE_ID} descriptor.`);
  }
  if (!environment?.root || !environment?.browserWindow
    || typeof environment?.readStorage !== 'function'
    || typeof environment?.crypto?.randomUUID !== 'function') {
    throw new TypeError(`${SESSION_APPLICATION_MODULE_ID} requires root, browserWindow, crypto, and readStorage().`);
  }
  return Object.freeze({
    descriptor,
    instantiate({ optionalPorts, requiredPorts }) {
      lifecycleObserver('instantiate', SESSION_APPLICATION_MODULE_ID);
      const browserApi = requireApplicationPort(
        requiredPorts, 'adapter.session-browser-ui', 'createSessionBrowser',
      );
      const dateApi = requireApplicationPort(
        requiredPorts, 'adapter.market-data-provider', 'createMarketDateAvailability',
      );
      requireApplicationPort(requiredPorts, 'adapter.session-persistence', 'createStorageAdapter');
      requireApplicationPort(requiredPorts, 'adapter.session-persistence', 'createSessionRepository');
      requireApplicationPort(requiredPorts, 'core.session-store', 'createSessionStore');
      requireApplicationPort(
        requiredPorts,
        'core.replay-navigation-preference-store',
        'createReplayNavigationPreferenceStore',
      );
      requireApplicationPort(requiredPorts, 'core.workstation-settings', 'createWorkstationSettingsRuntime');
      requireApplicationPort(requiredPorts, 'core.workstation-settings', 'createColorHistoryStore');
      const pluginProfileApi = requireApplicationPort(
        requiredPorts,
        'core.plugin-profile',
        'createCorePluginProfileRuntime',
      );
      const resources = createSessionApplicationResources({
        browserApi,
        dateApi,
        environment,
        lifecycleObserver,
        optionalPorts,
        pluginProfileApi,
        requiredPorts,
      });
      return Object.freeze({
        dispose: resources.dispose,
        publicApi: Object.freeze({ snapshot: resources.snapshot }),
        start: resources.start,
        stop: resources.stop,
      });
    },
  });
}
