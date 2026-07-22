import { createChartAdapterVisibleReceipt } from '../chart-snapshot-application/public.js';
import { failLightweightAdapter } from './adapter-error.js';
import { createLightweightChartAdapter } from './lightweight-chart-adapter.js';

function method(port, name, label) {
  if (!port || typeof port[name] !== 'function') {
    failLightweightAdapter('CHART_PANE_SET_PORT_INVALID', `${label} requires ${name}().`);
  }
  return port[name].bind(port);
}

/**
 * Own one real chart adapter per product Pane behind one complete Pane-set
 * chart-writer port. Child charts never receive transaction or Replay intent;
 * they only stage/apply the Pane snapshots supplied by the sole application.
 */
export function createLightweightPaneSetAdapter({
  createPaneAdapter = createLightweightChartAdapter,
  onCrosshairChange = () => {},
  onHistoryBoundary = () => {},
  onTruncationSelect = () => {},
  onViewportIntent = () => {},
  requestFrame = window.requestAnimationFrame.bind(window),
  resolveViewportPort,
  surfacePort,
}) {
  const preparePane = method(surfacePort, 'preparePane', 'Pane surface port');
  const commitPaneSet = method(surfacePort, 'commitPaneSet', 'Pane surface port');
  const viewportFor = typeof resolveViewportPort === 'function'
    ? resolveViewportPort
    : () => failLightweightAdapter(
      'CHART_PANE_SET_VIEWPORT_INVALID',
      'Pane-set adapter requires resolveViewportPort().',
    );
  const adapters = new Map();
  let adapterRevision = 0;
  let disposed = false;
  let crosshairSync = false;
  let crosshairSource = null;
  let truncationSelectionActive = false;
  let visiblePaneIds = [];

  function latestFor(paneId) {
    return adapters.get(paneId)?.crosshairObservation() ?? Object.freeze({
      bar: null, change: null, displayEpochMs: null, state: 'empty',
    });
  }

  function publishCrosshair(sourcePaneId = null, sourceObservation = null) {
    const synchronize = crosshairSync && !truncationSelectionActive
      && sourceObservation?.state === 'selected';
    const panes = visiblePaneIds.map((paneId) => {
      const adapter = adapters.get(paneId);
      let value;
      if (paneId === sourcePaneId && sourceObservation) value = sourceObservation;
      else if (synchronize && adapter) {
        value = adapter.projectCrosshair(sourceObservation.displayEpochMs);
      } else {
        if (crosshairSync && adapter && paneId !== sourcePaneId) adapter.clearCrosshairPosition();
        value = latestFor(paneId);
      }
      return Object.freeze({ ...value, paneId });
    });
    onCrosshairChange(Object.freeze({ panes: Object.freeze(panes), sourcePaneId }));
  }

  function acceptLocalCrosshair(paneId, observation) {
    if (observation.state === 'selected') {
      crosshairSource = Object.freeze({ displayEpochMs: observation.displayEpochMs, paneId });
      publishCrosshair(paneId, observation);
      return;
    }
    if (crosshairSource?.paneId === paneId) crosshairSource = null;
    publishCrosshair();
  }

  function refreshCrosshair() {
    if (!crosshairSource) {
      publishCrosshair();
      return;
    }
    const source = adapters.get(crosshairSource.paneId);
    const observation = source?.crosshairObservation(crosshairSource.displayEpochMs) ?? null;
    if (!observation || observation.state !== 'selected') {
      crosshairSource = null;
      publishCrosshair();
      return;
    }
    publishCrosshair(crosshairSource.paneId, observation);
  }

  function ensureAdapter(paneId) {
    if (adapters.has(paneId)) return adapters.get(paneId);
    const host = preparePane(paneId);
    const adapter = createPaneAdapter({
      host,
      onCrosshairMove: (observation) => acceptLocalCrosshair(paneId, observation),
      onHistoryBoundary: (range) => onHistoryBoundary(paneId, range),
      onTruncationSelect: (selection) => onTruncationSelect(paneId, selection),
      onViewportIntent: (intent) => onViewportIntent(paneId, intent),
      requestFrame,
      viewportPort: viewportFor(paneId),
    });
    adapter.setTruncationSelection(truncationSelectionActive);
    adapters.set(paneId, adapter);
    return adapter;
  }

  async function discardEntries(entries) {
    const results = await Promise.allSettled(entries
      .filter((entry) => entry.status === 'ready')
      .map((entry) => entry.adapter.discard(entry.staged)));
    const failures = results.filter(({ status }) => status === 'rejected').map(({ reason }) => reason);
    if (failures.length > 0) throw new AggregateError(failures, 'Pane rollback failed.');
  }

  async function applyReadyEntries(context) {
    const results = await Promise.allSettled(context.staged.entries.map(async (entry) => {
      if (entry.status !== 'ready') return;
      await entry.adapter.applyVisible(Object.freeze({
        identity: context.identity,
        isCurrent: context.isCurrent,
        signal: context.signal,
        staged: entry.staged,
        workspaceSnapshot: entry.snapshot,
      }));
    }));
    const failure = results.find(({ status }) => status === 'rejected');
    if (!failure) return;
    try { await discardEntries(context.staged.entries); } catch { /* Preserve the first apply failure. */ }
    throw failure.reason;
  }

  return Object.freeze({
    async applyVisible(context) {
      if (disposed) failLightweightAdapter('CHART_ADAPTER_DISPOSED', 'Pane-set adapter is disposed.');
      await applyReadyEntries(context);
      if (!context.isCurrent()) {
        failLightweightAdapter('CHART_ADAPTER_STALE', 'Pane-set chart application is stale.');
      }
      visiblePaneIds = context.staged.entries.map(({ paneId }) => paneId);
      const acceptedPaneIds = new Set(context.staged.entries.map(({ paneId }) => paneId));
      commitPaneSet(Object.freeze({
        activePaneId: context.workspaceSnapshot.responsePlan.activePaneId,
        panes: Object.freeze(context.staged.entries.map((entry) => Object.freeze({
          paneId: entry.paneId,
          reason: entry.reason,
          status: entry.status,
        }))),
      }));
      for (const [paneId, adapter] of adapters) {
        if (acceptedPaneIds.has(paneId)) continue;
        adapter.dispose();
        adapters.delete(paneId);
      }
      if (crosshairSource && !adapters.has(crosshairSource.paneId)) crosshairSource = null;
      refreshCrosshair();
      adapterRevision += 1;
      return createChartAdapterVisibleReceipt({
        adapterRevision,
        identity: context.identity,
        workspaceSnapshot: context.workspaceSnapshot,
      });
    },
    async discard(staged) { await discardEntries(staged.entries); },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const adapter of adapters.values()) adapter.dispose();
      adapters.clear();
      crosshairSource = null;
      visiblePaneIds = [];
    },
    resetView(paneId, latestOffsetBars = 12) {
      adapters.get(paneId)?.resetView(latestOffsetBars);
    },
    setTruncationSelection(active) {
      truncationSelectionActive = active === true;
      for (const adapter of adapters.values()) adapter.setTruncationSelection(truncationSelectionActive);
      refreshCrosshair();
    },
    setCrosshairSync(active) {
      crosshairSync = active === true;
      for (const [paneId, adapter] of adapters) {
        if (paneId !== crosshairSource?.paneId) adapter.clearCrosshairPosition();
      }
      refreshCrosshair();
    },
    snapshot() {
      return Object.freeze({
        adapterRevision,
        crosshairSync,
        panes: Object.freeze([...adapters].map(([paneId, adapter]) => Object.freeze({
          paneId,
          snapshot: adapter.snapshot(),
        }))),
      });
    },
    async stage({ identity, signal, workspaceSnapshot }) {
      if (disposed) failLightweightAdapter('CHART_ADAPTER_DISPOSED', 'Pane-set adapter is disposed.');
      const entries = await Promise.all(workspaceSnapshot.panes.map(async (result) => {
        if (result.status === 'empty') {
          preparePane(result.paneId);
          return Object.freeze({
            adapter: null,
            paneId: result.paneId,
            reason: result.reason,
            snapshot: null,
            staged: null,
            status: 'empty',
          });
        }
        const adapter = ensureAdapter(result.paneId);
        const staged = await adapter.stage({ identity, signal, workspaceSnapshot: result.snapshot });
        return Object.freeze({
          adapter,
          paneId: result.paneId,
          reason: null,
          snapshot: result.snapshot,
          staged,
          status: 'ready',
        });
      }));
      return Object.freeze({ entries: Object.freeze(entries), identity, signal, workspaceSnapshot });
    },
  });
}
