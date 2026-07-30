import {
  createPaneTimeLocationCommand,
  createPaneTimeLocationSelection,
  readPaneTimeLocationCommand,
} from '../pane-time-location-domain/public.js';
import { createTimePresentation } from '../workstation-settings/public.js';
import { readWorkspaceStateSnapshot } from '../workspace-state-runtime/public.js';
import { readWorkspacePaneIdentity } from './pane-identity.js';

const MAXIMUM_HISTORY_WINDOWS = 16;

/** Coordinate explicit context-menu time location without owning Replay, charts, or bar data. */
export function createPaneTimeLocationController({
  adapter,
  execution,
  market,
  workspaceState,
  readSettings,
  view,
}) {
  const instrumentLabels = new Map(market.instrumentOptions.map(({ id, label }) => [id, label]));
  const timeframeLabels = new Map(market.timeframes.map(({ id, label }) => [id, label]));
  let disposed = false;

  function acceptedWorkspace() {
    return readWorkspaceStateSnapshot(workspaceState.snapshot()).paneWorkspace;
  }

  function paneLabel(pane) {
    const identity = readWorkspacePaneIdentity(pane.paneId);
    return `${identity.label} · ${instrumentLabels.get(pane.instrumentId) ?? pane.instrumentId}`
      + ` · ${timeframeLabels.get(pane.timeframeId) ?? pane.timeframeId}`;
  }

  async function locateTarget(targetPaneId, marketEpochMs) {
    for (let requestCount = 0; requestCount <= MAXIMUM_HISTORY_WINDOWS; requestCount += 1) {
      const result = adapter.locateMarketTime(targetPaneId, marketEpochMs);
      if (result.status !== 'history-required') return result;
      if (requestCount === MAXIMUM_HISTORY_WINDOWS) break;
      const terminal = await execution.requestTimeLocationHistory(targetPaneId, marketEpochMs);
      if (!terminal) break;
    }
    return Object.freeze({
      marketEpochMs,
      reason: 'history-limit',
      status: 'unavailable',
    });
  }

  return Object.freeze({
    dispose() { disposed = true; },
    async locate(request) {
      if (disposed || execution.isPending()) return null;
      let command;
      try {
        command = createPaneTimeLocationCommand(request);
      } catch {
        view.setGotoFeedback('The Pane time-location request is no longer valid.');
        return null;
      }
      const value = readPaneTimeLocationCommand(command);
      const workspace = workspaceState.read(acceptedWorkspace());
      const visiblePaneIds = new Set(workspace.panes.map(({ paneId }) => paneId));
      const validTargets = value.targetPaneIds.filter((paneId) => (
        visiblePaneIds.has(paneId) && paneId !== value.selection.sourcePaneId
      ));
      if (validTargets.length !== value.targetPaneIds.length) {
        view.setGotoFeedback('The Pane layout changed before time location could run.');
        return null;
      }
      view.setGotoFeedback(null);
      const results = [];
      for (const paneId of validTargets) {
        const result = await locateTarget(paneId, value.selection.marketEpochMs);
        results.push(Object.freeze({ paneId, result }));
      }
      const located = results.filter(({ result }) => result.status === 'located');
      const labels = new Map(workspace.panes.map((pane) => [pane.paneId, paneLabel(pane)]));
      if (located.length !== results.length) {
        const unavailable = results.filter(({ result }) => result.status !== 'located');
        view.setGotoFeedback(`Time location unavailable in ${
          unavailable.map(({ paneId }) => labels.get(paneId)).join(', ')
        }; no unrelated candle was selected.`);
      }
      return Object.freeze(results);
    },
    open({ clientX, clientY, coordinateX, paneId }) {
      if (disposed || execution.isPending()) return false;
      const workspace = workspaceState.read(acceptedWorkspace());
      if (workspace.panes.length < 2 || !workspace.panes.some((pane) => pane.paneId === paneId)) return false;
      const observation = adapter.resolveTimeLocationSelection(paneId, coordinateX);
      if (!observation) return false;
      const selection = createPaneTimeLocationSelection({
        marketEpochMs: observation.marketEpochMs,
        sourcePaneId: paneId,
      });
      const source = workspace.panes.find((pane) => pane.paneId === paneId);
      const targets = workspace.panes
        .filter((pane) => pane.paneId !== paneId)
        .map((pane) => Object.freeze({ label: paneLabel(pane), paneId: pane.paneId }));
      view.openPaneTimeLocationMenu(Object.freeze({
        clientX,
        clientY,
        selection,
        sourceLabel: paneLabel(source),
        targets: Object.freeze(targets),
        timeLabel: formatTime(readSettings(), observation.marketEpochMs),
      }));
      return true;
    },
  });
}

function formatTime(settings, epochMs) {
  return createTimePresentation(settings).formatDateTime(epochMs);
}
