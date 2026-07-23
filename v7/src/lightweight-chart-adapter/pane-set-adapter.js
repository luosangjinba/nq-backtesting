import { createChartAdapterVisibleReceipt } from '../chart-snapshot-application/public.js';
import { createWorkstationSettings, readWorkstationSettings } from '../workstation-settings/public.js';
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
  resolvePriceIncrement,
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
  const priceIncrementFor = typeof resolvePriceIncrement === 'function'
    ? resolvePriceIncrement
    : () => failLightweightAdapter(
      'CHART_PANE_SET_PRICE_INCREMENT_INVALID',
      'Pane-set adapter requires resolvePriceIncrement().',
    );
  const adapters = new Map();
  let adapterRevision = 0;
  let disposed = false;
  let crosshairSync = false;
  let crosshairSource = null;
  let truncationSelectionActive = false;
  let visiblePaneIds = [];
  let workstationSettings = createWorkstationSettings();
  let settingsRevision = 0;
  const settingsStages = new WeakMap();

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

  function ensureAdapter(paneId, instrumentId) {
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
    if (typeof adapter.applyWorkstationSettings !== 'function') {
      adapter.dispose?.();
      failLightweightAdapter(
        'CHART_PANE_SETTINGS_PORT_INVALID',
        'Pane adapter requires applyWorkstationSettings().',
      );
    }
    adapter.applyWorkstationSettings(workstationSettings, priceIncrementFor(instrumentId));
    adapter.setTruncationSelection(truncationSelectionActive);
    adapters.set(paneId, adapter);
    return adapter;
  }

  async function discardEntries(entries) {
    const results = await Promise.allSettled(entries
      .filter((entry) => entry.adapter && entry.staged)
      .map((entry) => entry.adapter.discard(entry.staged)));
    const failures = results.filter(({ status }) => status === 'rejected').map(({ reason }) => reason);
    if (failures.length > 0) throw new AggregateError(failures, 'Pane rollback failed.');
  }

  async function applyEntries(context) {
    const results = await Promise.allSettled(context.staged.entries.map(async (entry) => {
      const childContext = Object.freeze({
        identity: context.identity,
        isCurrent: context.isCurrent,
        signal: context.signal,
        staged: entry.staged,
        workspaceSnapshot: entry.snapshot,
      });
      if (entry.status === 'empty') await entry.adapter.applyEmpty(childContext);
      else await entry.adapter.applyVisible(childContext);
    }));
    const failure = results.find(({ status }) => status === 'rejected');
    if (!failure) return;
    try { await discardEntries(context.staged.entries); } catch { /* Preserve the first apply failure. */ }
    throw failure.reason;
  }

  function settingsRecord(staged, expectedState) {
    const record = settingsStages.get(staged);
    if (!record || record.state !== expectedState) {
      failLightweightAdapter(
        'CHART_SETTINGS_STAGE_INVALID',
        `Chart Settings stage must be ${expectedState}.`,
      );
    }
    return record;
  }

  const workstationSettingsConsumer = Object.freeze({
    id: 'adapter.lightweight-chart:pane-set',
    stage(snapshot) {
      if (disposed) failLightweightAdapter('CHART_ADAPTER_DISPOSED', 'Pane-set adapter is disposed.');
      if (!snapshot || !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0) {
        failLightweightAdapter('CHART_SETTINGS_REVISION_INVALID', 'Chart Settings revision is invalid.');
      }
      readWorkstationSettings(snapshot.settings);
      const next = snapshot.settings;
      const staged = Object.freeze({ revision: snapshot.revision });
      settingsStages.set(staged, {
        next,
        previous: workstationSettings,
        previousRevision: settingsRevision,
        state: 'staged',
      });
      return staged;
    },
    apply(staged) {
      const record = settingsRecord(staged, 'staged');
      const applied = [];
      try {
        for (const adapter of adapters.values()) {
          adapter.applyWorkstationSettings(record.next);
          applied.push(adapter);
        }
        record.state = 'applied';
      } catch (error) {
        for (const adapter of applied.reverse()) {
          try { adapter.applyWorkstationSettings(record.previous); } catch { /* Preserve first failure. */ }
        }
        throw error;
      }
      return Object.freeze({ revision: staged.revision });
    },
    commit(staged) {
      const record = settingsRecord(staged, 'applied');
      workstationSettings = record.next;
      settingsRevision = staged.revision;
      record.state = 'committed';
    },
    rollback(staged) {
      const record = settingsStages.get(staged);
      if (!record || record.state === 'rolled-back' || record.state === 'staged') return;
      for (const adapter of adapters.values()) adapter.applyWorkstationSettings(record.previous);
      workstationSettings = record.previous;
      settingsRevision = record.previousRevision;
      record.state = 'rolled-back';
    },
  });

  return Object.freeze({
    async applyVisible(context) {
      if (disposed) failLightweightAdapter('CHART_ADAPTER_DISPOSED', 'Pane-set adapter is disposed.');
      await applyEntries(context);
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
        gridVisible: readWorkstationSettings(workstationSettings).canvas.gridVisible,
        panes: Object.freeze([...adapters].map(([paneId, adapter]) => Object.freeze({
          paneId,
          snapshot: adapter.snapshot(),
        }))),
        settingsRevision,
      });
    },
    async stage({ identity, signal, workspaceSnapshot }) {
      if (disposed) failLightweightAdapter('CHART_ADAPTER_DISPOSED', 'Pane-set adapter is disposed.');
      const entries = await Promise.all(workspaceSnapshot.panes.map(async (result, index) => {
        const instrumentId = workspaceSnapshot.responsePlan.paneResponses[index].instrumentId;
        const priceIncrement = priceIncrementFor(instrumentId);
        if (result.status === 'empty') {
          const adapter = ensureAdapter(result.paneId, instrumentId);
          const staged = await adapter.stageEmpty({ identity, priceIncrement, signal });
          return Object.freeze({
            adapter,
            paneId: result.paneId,
            reason: result.reason,
            snapshot: null,
            staged,
            status: 'empty',
          });
        }
        const adapter = ensureAdapter(result.paneId, instrumentId);
        const staged = await adapter.stage({
          identity, priceIncrement, signal, workspaceSnapshot: result.snapshot,
        });
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
    workstationSettingsConsumer,
  });
}
