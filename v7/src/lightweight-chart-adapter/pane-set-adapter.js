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
  onHistoryBoundary = () => {},
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

  function ensureAdapter(paneId) {
    if (adapters.has(paneId)) return adapters.get(paneId);
    const host = preparePane(paneId);
    const adapter = createLightweightChartAdapter({
      host,
      onHistoryBoundary: (range) => onHistoryBoundary(paneId, range),
      onViewportIntent: (intent) => onViewportIntent(paneId, intent),
      requestFrame,
      viewportPort: viewportFor(paneId),
    });
    adapters.set(paneId, adapter);
    return adapter;
  }

  return Object.freeze({
    async applyVisible(context) {
      if (disposed) failLightweightAdapter('CHART_ADAPTER_DISPOSED', 'Pane-set adapter is disposed.');
      await Promise.all(context.staged.entries.map(async (entry) => {
        if (entry.status !== 'ready') return;
        await entry.adapter.applyVisible(Object.freeze({
          identity: context.identity,
          isCurrent: context.isCurrent,
          signal: context.signal,
          staged: entry.staged,
          workspaceSnapshot: entry.snapshot,
        }));
      }));
      if (!context.isCurrent()) {
        failLightweightAdapter('CHART_ADAPTER_STALE', 'Pane-set chart application is stale.');
      }
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
      adapterRevision += 1;
      return createChartAdapterVisibleReceipt({
        adapterRevision,
        identity: context.identity,
        workspaceSnapshot: context.workspaceSnapshot,
      });
    },
    async discard() {},
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const adapter of adapters.values()) adapter.dispose();
      adapters.clear();
    },
    resetView(paneId, latestOffsetBars = 12) {
      adapters.get(paneId)?.resetView(latestOffsetBars);
    },
    snapshot() {
      return Object.freeze({
        adapterRevision,
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
