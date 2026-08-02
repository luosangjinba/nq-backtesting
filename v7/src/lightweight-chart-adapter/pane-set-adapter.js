import { createChartAdapterVisibleReceipt } from '../chart-snapshot-application/public.js';
import { createWorkstationSettings, readWorkstationSettings } from '../workstation-settings/public.js';
import { failLightweightAdapter } from './adapter-error.js';
import { createLightweightChartAdapter } from './lightweight-chart-adapter.js';
import { createSeriesMutationPlanMemo } from './series-update-plan.js';

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
  resolveInstrumentLabel,
  resolvePriceIncrement,
  resolveViewportPort,
  surfacePort,
}) {
  const preparePane = method(surfacePort, 'preparePane', 'Pane surface port');
  const applyPaneSet = method(surfacePort, 'applyPaneSet', 'Pane surface port');
  const finalizePaneSet = method(surfacePort, 'finalizePaneSet', 'Pane surface port');
  const releasePane = method(surfacePort, 'releasePane', 'Pane surface port');
  const rollbackPaneSurface = method(surfacePort, 'rollbackPaneSet', 'Pane surface port');
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
  const instrumentLabelFor = typeof resolveInstrumentLabel === 'function'
    ? resolveInstrumentLabel
    : () => failLightweightAdapter(
      'CHART_PANE_SET_INSTRUMENT_LABEL_INVALID',
      'Pane-set adapter requires resolveInstrumentLabel().',
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
  const paneSetStages = new WeakMap();
  let acceptedPaneSet = Object.freeze({ activePaneId: null, panes: Object.freeze([]) });

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

  function ensureAdapter(paneId, instrumentId, instrumentLabel) {
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
    adapter.applyWorkstationSettings(
      workstationSettings,
      priceIncrementFor(instrumentId),
      instrumentLabel,
    );
    adapter.setTruncationSelection(truncationSelectionActive);
    adapters.set(paneId, adapter);
    return adapter;
  }

  async function rollbackEntries(entries) {
    const results = await Promise.allSettled(entries
      .filter((entry) => entry.adapter && entry.staged)
      .map((entry) => entry.adapter.rollbackVisible(entry.staged)));
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
    if (failure) throw failure.reason;
  }

  function paneSetValue(workspaceSnapshot) {
    return Object.freeze({
      activePaneId: workspaceSnapshot.responsePlan.activePaneId,
      panes: Object.freeze(workspaceSnapshot.panes.map((entry) => Object.freeze({
        paneId: entry.paneId,
        reason: entry.reason,
        status: entry.status,
      }))),
    });
  }

  async function rollbackPaneSet(staged) {
    const record = paneSetStages.get(staged);
    if (!record || record.state === 'rolled-back') return;
    if (record.state === 'finalized') {
      failLightweightAdapter(
        'CHART_PANE_SET_STAGE_INVALID',
        'A finalized Pane-set stage cannot roll back.',
      );
    }
    await rollbackEntries(staged.entries);
    if (record.surfaceReceipt !== null) rollbackPaneSurface(record.surfaceReceipt);
    visiblePaneIds = record.previousPaneSet.panes.map(({ paneId }) => paneId);
    adapterRevision = record.previousAdapterRevision;
    record.state = 'rolled-back';
    refreshCrosshair();
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
      const record = paneSetStages.get(context.staged);
      if (!record || record.state !== 'staged') {
        failLightweightAdapter(
          'CHART_PANE_SET_STAGE_INVALID',
          'Pane-set stage is missing or already applied.',
        );
      }
      record.state = 'applying';
      try {
        await applyEntries(context);
        if (!context.isCurrent()) {
          failLightweightAdapter('CHART_ADAPTER_STALE', 'Pane-set chart application is stale.');
        }
        record.candidatePaneSet = paneSetValue(context.workspaceSnapshot);
        record.surfaceReceipt = applyPaneSet(record.candidatePaneSet);
        visiblePaneIds = record.candidatePaneSet.panes.map(({ paneId }) => paneId);
        refreshCrosshair();
        adapterRevision = record.previousAdapterRevision + 1;
        record.state = 'applied';
        return createChartAdapterVisibleReceipt({
          adapterRevision,
          identity: context.identity,
          workspaceSnapshot: context.workspaceSnapshot,
        });
      } catch (error) {
        try { await rollbackPaneSet(context.staged); } catch { /* Preserve first apply failure. */ }
        throw error;
      }
    },
    finalizeVisible(staged) {
      const record = paneSetStages.get(staged);
      if (!record || record.state !== 'applied') {
        failLightweightAdapter(
          'CHART_PANE_SET_STAGE_INVALID',
          'Only an applied Pane-set stage can finalize.',
        );
      }
      for (const entry of staged.entries) entry.adapter.finalizeVisible(entry.staged);
      finalizePaneSet(record.surfaceReceipt);
      acceptedPaneSet = record.candidatePaneSet;
      const acceptedPaneIds = new Set(acceptedPaneSet.panes.map(({ paneId }) => paneId));
      for (const [paneId, adapter] of adapters) {
        if (acceptedPaneIds.has(paneId)) continue;
        try { adapter.dispose(); } catch { /* Accepted visibility remains authoritative. */ }
        adapters.delete(paneId);
        try { releasePane(paneId); } catch { /* Detached Pane cleanup is best effort. */ }
      }
      if (crosshairSource && !adapters.has(crosshairSource.paneId)) crosshairSource = null;
      record.state = 'finalized';
      refreshCrosshair();
    },
    async rollbackVisible(staged) { await rollbackPaneSet(staged); },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const adapter of adapters.values()) adapter.dispose();
      adapters.clear();
      crosshairSource = null;
      visiblePaneIds = [];
    },
    resetView(paneId, latestOffsetBars = undefined) {
      adapters.get(paneId)?.resetView(latestOffsetBars);
    },
    readPaneHistoryState(paneId) {
      const snapshot = adapters.get(paneId)?.snapshot();
      if (!snapshot?.logicalRange || snapshot.barCount < 1) return null;
      return Object.freeze({
        barCount: snapshot.barCount,
        logicalRange: Object.freeze({ ...snapshot.logicalRange }),
      });
    },
    locateMarketTime(paneId, marketEpochMs) {
      const adapter = adapters.get(paneId);
      if (!adapter) return Object.freeze({
        marketEpochMs,
        reason: 'target-not-ready',
        status: 'unavailable',
      });
      return adapter.locateMarketTime(marketEpochMs);
    },
    resolveTimeLocationSelection(paneId, coordinateX) {
      return adapters.get(paneId)?.resolveTimeLocationSelection(coordinateX) ?? null;
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
        acceptedPaneIds: Object.freeze(acceptedPaneSet.panes.map(({ paneId }) => paneId)),
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
      const chartDataCache = new WeakMap();
      const futureTimeAxisDataCache = new Map();
      const seriesMutationPlanMemo = createSeriesMutationPlanMemo();
      const entries = await Promise.all(workspaceSnapshot.panes.map(async (result, index) => {
        const instrumentId = workspaceSnapshot.responsePlan.paneResponses[index].instrumentId;
        const instrumentLabel = instrumentLabelFor(instrumentId);
        if (typeof instrumentLabel !== 'string' || instrumentLabel.trim().length === 0) {
          failLightweightAdapter(
            'CHART_PANE_SET_INSTRUMENT_LABEL_INVALID',
            `Pane instrument ${instrumentId} requires a non-empty display label.`,
          );
        }
        const priceIncrement = priceIncrementFor(instrumentId);
        if (result.status === 'empty') {
          const adapter = ensureAdapter(result.paneId, instrumentId, instrumentLabel);
          const staged = await adapter.stageEmpty({
            identity, instrumentLabel, priceIncrement, signal,
          });
          return Object.freeze({
            adapter,
            paneId: result.paneId,
            reason: result.reason,
            snapshot: null,
            staged,
            status: 'empty',
          });
        }
        const adapter = ensureAdapter(result.paneId, instrumentId, instrumentLabel);
        const staged = await adapter.stage({
          chartDataCache,
          identity,
          instrumentLabel,
          priceIncrement,
          signal,
          futureTimeAxisDataCache,
          seriesMutationPlanMemo,
          workspaceSnapshot: result.snapshot,
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
      const staged = Object.freeze({
        entries: Object.freeze(entries), identity, signal, workspaceSnapshot,
      });
      paneSetStages.set(staged, {
        candidatePaneSet: null,
        previousAdapterRevision: adapterRevision,
        previousPaneSet: acceptedPaneSet,
        state: 'staged',
        surfaceReceipt: null,
      });
      return staged;
    },
    workstationSettingsConsumer,
  });
}
