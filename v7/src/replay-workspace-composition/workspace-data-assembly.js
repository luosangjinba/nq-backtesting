import {
  createBarDataRuntime,
  createProjectedHistoryRuntime,
} from '../bar-data-runtime/public.js';
import { createPaneSetMaterializationPorts } from '../pane-set-materialization/public.js';
import {
  createReplayNavigationReplayPort,
  createReplayNavigationTargetResolver,
} from '../replay-navigation-runtime/public.js';
import { createFoundationSourceTraversal } from './foundation-source-traversal.js';
import { createPaneDataComposition } from './pane-data-composition.js';

/** Construct Bar Data, Projection acquisition, traversal, and Replay proposal ports. */
export function createWorkspaceDataAssembly({ getRuntime, session }) {
  const { market, replay } = session;
  const barData = createBarDataRuntime({
    maxCacheEntries: 48,
    maxConcurrentRequests: 2,
    resolveProvider: () => market.provider,
  });
  const projectedHistoryData = createProjectedHistoryRuntime({
    maxCacheEntries: 24,
    maxConcurrentRequests: 2,
    resolveProvider: () => market.projectedHistoryProvider,
  });
  const paneData = createPaneDataComposition({
    barData,
    market,
    projectedHistoryData,
    readAcceptedSnapshot: () => getRuntime()?.snapshot().acceptedSnapshot?.workspace ?? null,
  });
  const materialization = createPaneSetMaterializationPorts({
    acquisitionPort: paneData.acquisitionPort,
    projectionPort: paneData.projectionPort,
  });
  const traversal = createFoundationSourceTraversal({ barData, market });
  const targetResolver = createReplayNavigationTargetResolver({
    resolveSchedule: session.readNavigationSchedule,
    sourceTraversalPort: traversal,
  });
  const replayPort = createReplayNavigationReplayPort({ replayRuntime: replay, targetResolver });
  return Object.freeze({
    barData,
    materialization,
    paneData,
    projectedHistoryData,
    replayPort,
  });
}
