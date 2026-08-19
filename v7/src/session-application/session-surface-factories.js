import { createCalculatedSeriesSurfaceConfiguration } from './calculated-series-optional-ports.js';
import { SESSION_BROWSER_CONFIG } from './config.js';

export function createApplicationReplayWorkspace({
  composed,
  environment,
  optional,
  pluginCenter,
  pluginProfile,
  validationCampaign,
}) {
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
    calculatedSeries: createCalculatedSeriesSurfaceConfiguration({
      composed, environment, optional, pluginProfile,
    }),
    pluginCenter,
    validationCampaign: validationCampaign?.replayConfiguration ?? null,
  });
}

export function createApplicationSessionBrowser({
  browserApi,
  composed,
  dateApi,
  environment,
  navigation,
  replayWorkspace,
  stateSync,
  unavailableMessage,
  validationCampaign,
}) {
  return browserApi.createSessionBrowser({
    campaignSurface: validationCampaign?.ui ?? null,
    colorHistory: composed?.colorHistory ?? null,
    dateAvailability: dateApi.createMarketDateAvailability(),
    idFactory: () => `session-${environment.crypto.randomUUID()}`,
    instruments: SESSION_BROWSER_CONFIG.instruments,
    navigation,
    openedSessionSurface: composed ? replayWorkspace : null,
    replayNavigationPreferences: composed?.replayNavigationPreferences ?? null,
    root: environment.root,
    stateSync,
    store: composed?.sessionStore ?? null,
    unavailableMessage,
    workstationSettings: composed?.workstationSettings ?? null,
  });
}
