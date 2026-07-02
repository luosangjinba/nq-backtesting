import { registerCommand } from './commands.js';
import { subscribeEvent } from './events.js';
import { CHART_COMMANDS, CHART_EVENTS } from '../contracts/chart-contracts.js';
import { DISPLAY_TIMEZONE_EVENTS } from '../contracts/timezone-contracts.js';
import {
  CHART_PRESENTATION_EVENTS,
  DEFAULT_CHART_PRESENTATION_SETTINGS,
} from '../contracts/chart-presentation-contracts.js';
import { createChartEngineAdapter } from './chart-engine-adapter.js';
import {
  cloneBackgroundStyle,
  cloneCandleStyle,
  cloneCrosshairStyle,
  cloneGridStyle,
  cloneScaleStyle,
  cloneWatermarkStyle,
  createEmptyChartState,
  normalizeBars,
  normalizeCrosshair,
  normalizeDisplayTimeframe,
  normalizeGoToPayload,
  normalizeLoadedCoverage,
  normalizeRange,
  normalizeViewportFollow,
  rangesEqual,
  readHostMetrics,
  timestampSeconds,
} from './chart-runtime-state.js';
import {
  clampVisibleRange,
  computePrefixDemand,
  computeRenderedBars,
  computeViewportDemand,
  deriveGoToRange,
  deriveManualAnchorRange,
  derivePanRange,
  deriveZoomRange,
} from './chart-runtime-viewport.js';

export { CHART_COMMANDS, CHART_EVENTS };

export function createChartRuntime() {
  const mountedHosts = new Set();
  const mountedHostList = new Set();
  const chartAdapters = new Map();
  const unregisterCallbacks = [];
  const state = createEmptyChartState();
  let rootElement = null;
  let observer = null;
  let emit = () => {};
  let applyingRuntimeVisibleRange = false;
  let pendingChartSyncAfterNativeInteraction = false;

  function buildChartMetadata(renderedBars = computeRenderedBars(state)) {
    return {
      viewportFollow: state.viewportFollow.enabled ? 'true' : 'false',
      interactionMode: state.interaction.mode,
      renderedBarCount: renderedBars.length,
      fullBarCount: state.bars.length,
      crosshairActive: state.crosshair.active ? 'true' : 'false',
      crosshairTime: state.crosshair.time || '',
      crosshairPrice: state.crosshair.price == null ? '' : state.crosshair.price,
      nativeInteractionActive: state.nativeInteraction.active ? 'true' : 'false',
      nativeInteractionType: state.nativeInteraction.type || '',
    };
  }

  function syncChartHost(host, { deferDuringNativeInteraction = true } = {}) {
    const adapter = chartAdapters.get(host);
    if (!adapter) return;
    if (deferDuringNativeInteraction && state.nativeInteraction.active) {
      pendingChartSyncAfterNativeInteraction = true;
      adapter.setMetadata?.(buildChartMetadata());
      return;
    }
    const renderedBars = computeRenderedBars(state);
    applyingRuntimeVisibleRange = true;
    try {
      adapter.setPresentation(state.displayContext);
      adapter.setBars(renderedBars, {
        fullBarCount: state.bars.length,
        displayContext: state.displayContext,
        metadata: buildChartMetadata(renderedBars),
        followViewport: state.interaction.mode === 'follow' && state.viewportFollow.enabled,
      });
      if (state.interaction.mode === 'manual') {
        adapter.setVisibleRange(state.visibleRange);
      }
    } finally {
      applyingRuntimeVisibleRange = false;
    }
  }

  function mountHost(host) {
    if (!host || mountedHosts.has(host)) return;
    mountedHosts.add(host);
    mountedHostList.add(host);
    const adapter = createChartEngineAdapter();
    chartAdapters.set(host, adapter);
    adapter.mount(host, {
      displayContext: state.displayContext,
      onVisibleRangeChange: (visibleRange, metadata = {}) => {
        if (applyingRuntimeVisibleRange) return;
        if (metadata.source === 'lightweight-native') {
          observeNativeVisibleRange(visibleRange);
          return;
        }
        setManualVisibleRange(visibleRange);
      },
      onCrosshairChange: (crosshair) => {
        updateCrosshair(crosshair);
      },
      onNativeInteractionChange: (interaction) => {
        updateNativeInteraction(interaction);
      },
    });
    syncChartHost(host);
    emit(CHART_EVENTS.READY, { host });
  }

  function mountAvailableHosts() {
    rootElement
      ?.querySelectorAll('[data-chart-host]')
      .forEach((host) => mountHost(host));
  }

  function rerenderMountedHosts(options = {}) {
    for (const host of mountedHostList) {
      if (host.isConnected) {
        syncChartHost(host, options);
      } else {
        chartAdapters.get(host)?.destroy();
        chartAdapters.delete(host);
        mountedHosts.delete(host);
        mountedHostList.delete(host);
      }
    }
  }

  function syncVisibleRangeToMountedHosts() {
    for (const host of mountedHostList) {
      if (!host.isConnected) continue;
      const adapter = chartAdapters.get(host);
      if (state.nativeInteraction.active) {
        pendingChartSyncAfterNativeInteraction = true;
        adapter?.setMetadata?.(buildChartMetadata());
        continue;
      }
      applyingRuntimeVisibleRange = true;
      try {
        adapter?.setVisibleRange(state.visibleRange);
      } finally {
        applyingRuntimeVisibleRange = false;
      }
    }
  }

  function syncMetadataToMountedHosts() {
    const metadata = buildChartMetadata();
    for (const host of mountedHostList) {
      if (!host.isConnected) continue;
      chartAdapters.get(host)?.setMetadata?.(metadata);
    }
  }

  function updateBars(nextBars) {
    state.bars = nextBars;
    state.prefixDemand = computePrefixDemand(state);
    state.viewportDemand = computeViewportDemand(state);
    rerenderMountedHosts();
    emit(CHART_EVENTS.BARS_CHANGED, { bars: [...state.bars] });
    return { bars: [...state.bars] };
  }

  function getViewportMetrics() {
    const host = [...mountedHostList].find((candidate) => candidate.isConnected);
    return readHostMetrics(host);
  }

  function updateVisibleRange(range) {
    const visibleRange = clampVisibleRange(normalizeRange(range), state.rightEdgeLimit);
    state.visibleRange = visibleRange;
    state.prefixDemand = computePrefixDemand(state);
    state.viewportDemand = computeViewportDemand(state);
    rerenderMountedHosts();
    emit(CHART_EVENTS.VISIBLE_RANGE_CHANGED, { visibleRange: { ...visibleRange } });
    if (state.viewportDemand) {
      emit(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand: { ...state.viewportDemand } });
    }
    if (state.prefixDemand) {
      emit(CHART_EVENTS.PREFIX_DEMAND, { prefixDemand: { ...state.prefixDemand } });
    }
    return {
      visibleRange: { ...visibleRange },
      viewportDemand: state.viewportDemand ? structuredClone(state.viewportDemand) : null,
      prefixDemand: state.prefixDemand ? { ...state.prefixDemand } : null,
    };
  }

  function setRightEdgeLimit({ rightEdge } = {}) {
    state.rightEdgeLimit = timestampSeconds(rightEdge, 'chart right edge limit');
    let visibleRangeChanged = false;

    if (state.visibleRange && state.interaction.mode !== 'manual') {
      const visibleRange = clampVisibleRange(state.visibleRange, state.rightEdgeLimit);
      visibleRangeChanged = !rangesEqual(state.visibleRange, visibleRange);
      state.visibleRange = visibleRange;
    }

    state.prefixDemand = computePrefixDemand(state);
    state.viewportDemand = computeViewportDemand(state);
    rerenderMountedHosts();

    if (state.visibleRange && visibleRangeChanged) {
      emit(CHART_EVENTS.VISIBLE_RANGE_CHANGED, { visibleRange: { ...state.visibleRange } });
    }
    if (state.viewportDemand) {
      emit(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand: structuredClone(state.viewportDemand) });
    }
    if (state.prefixDemand) {
      emit(CHART_EVENTS.PREFIX_DEMAND, { prefixDemand: { ...state.prefixDemand } });
    }

    return {
      rightEdgeLimit: state.rightEdgeLimit,
      visibleRange: state.visibleRange ? { ...state.visibleRange } : null,
      interaction: structuredClone(state.interaction),
      renderedBars: computeRenderedBars(state),
      viewportDemand: state.viewportDemand ? structuredClone(state.viewportDemand) : null,
      prefixDemand: state.prefixDemand ? { ...state.prefixDemand } : null,
    };
  }

  function getVisibleRange() {
    return {
      rightEdgeLimit: state.rightEdgeLimit,
      visibleRange: state.visibleRange ? { ...state.visibleRange } : null,
    };
  }

  function getPrefixDemand() {
    state.prefixDemand = computePrefixDemand(state);
    return {
      prefixDemand: state.prefixDemand ? { ...state.prefixDemand } : null,
    };
  }

  function setViewportFollow(payload = {}) {
    const nextViewportFollow = normalizeViewportFollow(payload, state);
    let visibleRangeChanged = false;
    if (payload.resume) {
      state.visibleRange = null;
      state.interaction = {
        mode: 'follow',
        manualVisibleRange: null,
      };
    } else {
      const manualAnchorRange = deriveManualAnchorRange(state, nextViewportFollow);
      if (manualAnchorRange) {
        visibleRangeChanged = !rangesEqual(state.visibleRange, manualAnchorRange)
          || !rangesEqual(state.interaction.manualVisibleRange, manualAnchorRange);
        state.visibleRange = { ...manualAnchorRange };
        state.interaction = {
          mode: 'manual',
          manualVisibleRange: { ...manualAnchorRange },
        };
        state.prefixDemand = computePrefixDemand(state);
        state.viewportDemand = computeViewportDemand(state);
      }
    }
    state.viewportFollow = state.interaction.mode === 'manual' && !payload.resume
      ? {
        ...nextViewportFollow,
        enabled: false,
      }
      : nextViewportFollow;
    rerenderMountedHosts();
    if (visibleRangeChanged && state.visibleRange) {
      emit(CHART_EVENTS.VISIBLE_RANGE_CHANGED, { visibleRange: { ...state.visibleRange } });
    }
    if (visibleRangeChanged && state.viewportDemand) {
      emit(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand: structuredClone(state.viewportDemand) });
    }
    if (visibleRangeChanged && state.prefixDemand) {
      emit(CHART_EVENTS.PREFIX_DEMAND, { prefixDemand: { ...state.prefixDemand } });
    }
    return {
      viewportFollow: { ...state.viewportFollow },
      interaction: structuredClone(state.interaction),
      visibleRange: state.visibleRange ? { ...state.visibleRange } : null,
      renderedBars: computeRenderedBars(state),
      fullBarCount: state.bars.length,
    };
  }

  function setManualVisibleRange(payload = {}) {
    const visibleRange = normalizeRange(payload);
    state.visibleRange = visibleRange;
    state.interaction = {
      mode: 'manual',
      manualVisibleRange: { ...visibleRange },
    };
    state.viewportFollow = {
      ...state.viewportFollow,
      enabled: false,
    };
    state.prefixDemand = computePrefixDemand(state);
    state.viewportDemand = computeViewportDemand(state);
    rerenderMountedHosts();
    emit(CHART_EVENTS.VISIBLE_RANGE_CHANGED, { visibleRange: { ...visibleRange } });
    if (state.viewportDemand) {
      emit(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand: { ...state.viewportDemand } });
    }
    if (state.prefixDemand) {
      emit(CHART_EVENTS.PREFIX_DEMAND, { prefixDemand: { ...state.prefixDemand } });
    }
    return {
      visibleRange: { ...visibleRange },
      viewportFollow: { ...state.viewportFollow },
      interaction: structuredClone(state.interaction),
      renderedBars: computeRenderedBars(state),
      viewportDemand: state.viewportDemand ? structuredClone(state.viewportDemand) : null,
      prefixDemand: state.prefixDemand ? { ...state.prefixDemand } : null,
    };
  }

  function observeNativeVisibleRange(payload = {}) {
    const visibleRange = normalizeRange(payload);
    state.visibleRange = visibleRange;
    state.interaction = {
      mode: 'manual',
      manualVisibleRange: { ...visibleRange },
    };
    state.viewportFollow = {
      ...state.viewportFollow,
      enabled: false,
    };
    state.prefixDemand = computePrefixDemand(state);
    state.viewportDemand = computeViewportDemand(state);
    syncMetadataToMountedHosts();
    emit(CHART_EVENTS.VISIBLE_RANGE_CHANGED, { visibleRange: { ...visibleRange } });
    if (state.viewportDemand) {
      emit(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand: { ...state.viewportDemand } });
    }
    if (state.prefixDemand) {
      emit(CHART_EVENTS.PREFIX_DEMAND, { prefixDemand: { ...state.prefixDemand } });
    }
    return {
      visibleRange: { ...visibleRange },
      viewportFollow: { ...state.viewportFollow },
      interaction: structuredClone(state.interaction),
      renderedBars: computeRenderedBars(state),
      viewportDemand: state.viewportDemand ? structuredClone(state.viewportDemand) : null,
      prefixDemand: state.prefixDemand ? { ...state.prefixDemand } : null,
      clamped: false,
    };
  }

  function goToTime(payload = {}) {
    const goTo = normalizeGoToPayload(payload);
    const visibleRange = deriveGoToRange(state, goTo);
    const result = setManualVisibleRange(visibleRange);
    return {
      ...result,
      targetTimestamp: goTo.targetTimestamp,
    };
  }

  function zoomVisibleRange(payload = {}) {
    const visibleRange = deriveZoomRange(state, payload);
    return setManualVisibleRange(visibleRange);
  }

  function panVisibleRange(payload = {}) {
    const visibleRange = derivePanRange(state, payload);
    return setManualVisibleRange(visibleRange);
  }

  function resumeViewportFollow() {
    state.visibleRange = null;
    state.interaction = {
      mode: 'follow',
      manualVisibleRange: null,
    };
    state.viewportFollow = {
      ...state.viewportFollow,
      enabled: true,
    };
    state.prefixDemand = null;
    state.viewportDemand = null;
    rerenderMountedHosts();
    return {
      viewportFollow: { ...state.viewportFollow },
      interaction: structuredClone(state.interaction),
      visibleRange: null,
      renderedBars: computeRenderedBars(state),
      fullBarCount: state.bars.length,
    };
  }

  function getRenderedBars() {
    return {
      viewportFollow: { ...state.viewportFollow },
      interaction: structuredClone(state.interaction),
      renderedBars: computeRenderedBars(state),
      fullBarCount: state.bars.length,
    };
  }

  function getInteractionState() {
    return {
      viewportFollow: { ...state.viewportFollow },
      interaction: structuredClone(state.interaction),
      nativeInteraction: structuredClone(state.nativeInteraction),
      visibleRange: state.visibleRange ? { ...state.visibleRange } : null,
      renderedBars: computeRenderedBars(state),
      fullBarCount: state.bars.length,
    };
  }

  function updateCrosshair(payload = {}) {
    state.crosshair = normalizeCrosshair(payload);
    emit(CHART_EVENTS.CROSSHAIR_CHANGED, { crosshair: structuredClone(state.crosshair) });
    return {
      crosshair: structuredClone(state.crosshair),
      interaction: structuredClone(state.interaction),
      viewportFollow: { ...state.viewportFollow },
      visibleRange: state.visibleRange ? { ...state.visibleRange } : null,
    };
  }

  function updateNativeInteraction(payload = {}) {
    const wasActive = state.nativeInteraction.active;
    state.nativeInteraction = {
      active: Boolean(payload.active),
      type: payload.active && payload.type ? String(payload.type) : null,
      source: payload.source ? String(payload.source) : null,
    };
    syncMetadataToMountedHosts();
    if (wasActive && !state.nativeInteraction.active && pendingChartSyncAfterNativeInteraction) {
      pendingChartSyncAfterNativeInteraction = false;
      rerenderMountedHosts({ deferDuringNativeInteraction: false });
    }
    if (wasActive && !state.nativeInteraction.active && state.viewportDemand) {
      emit(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand: structuredClone(state.viewportDemand) });
    }
    return {
      nativeInteraction: structuredClone(state.nativeInteraction),
      pendingChartSyncAfterNativeInteraction,
    };
  }

  function getCrosshairState() {
    return {
      crosshair: structuredClone(state.crosshair),
      interaction: structuredClone(state.interaction),
      viewportFollow: { ...state.viewportFollow },
      visibleRange: state.visibleRange ? { ...state.visibleRange } : null,
      renderedBars: computeRenderedBars(state),
      fullBarCount: state.bars.length,
    };
  }

  function setDisplayContext({
    instrument = state.displayContext.instrument,
    displayTimeframe = state.displayContext.displayTimeframe,
    loadedCoverage = state.displayContext.loadedCoverage,
    displayTimezone = state.displayContext.displayTimezone,
    exchangeTimezone = state.displayContext.exchangeTimezone,
    timeFormat = state.displayContext.timeFormat,
    dateFormat = state.displayContext.dateFormat,
    showDayOfWeekLabels = state.displayContext.showDayOfWeekLabels,
    showCrosshairReadout = state.displayContext.showCrosshairReadout,
    margins = state.displayContext.margins,
    rightOffsetBars = state.displayContext.rightOffsetBars,
    candleStyle = state.displayContext.candleStyle,
    gridStyle = state.displayContext.gridStyle,
    crosshairStyle = state.displayContext.crosshairStyle,
    backgroundStyle = state.displayContext.backgroundStyle,
    scaleStyle = state.displayContext.scaleStyle,
    watermarkStyle = state.displayContext.watermarkStyle,
  } = {}) {
    state.displayContext = {
      instrument: instrument == null ? null : String(instrument),
      displayTimeframe: normalizeDisplayTimeframe(displayTimeframe),
      loadedCoverage: normalizeLoadedCoverage(loadedCoverage),
      displayTimezone: displayTimezone || DEFAULT_DISPLAY_TIMEZONE,
      exchangeTimezone: exchangeTimezone || DEFAULT_EXCHANGE_TIMEZONE,
      timeFormat: timeFormat || DEFAULT_CHART_PRESENTATION_SETTINGS.timeFormat,
      dateFormat: dateFormat || DEFAULT_CHART_PRESENTATION_SETTINGS.dateFormat,
      showDayOfWeekLabels: showDayOfWeekLabels == null
        ? DEFAULT_CHART_PRESENTATION_SETTINGS.showDayOfWeekLabels
        : Boolean(showDayOfWeekLabels),
      showCrosshairReadout: showCrosshairReadout == null
        ? DEFAULT_CHART_PRESENTATION_SETTINGS.showCrosshairReadout
        : Boolean(showCrosshairReadout),
      margins: {
        topPercent: Number(margins?.topPercent ?? DEFAULT_CHART_PRESENTATION_SETTINGS.margins.topPercent),
        bottomPercent: Number(margins?.bottomPercent ?? DEFAULT_CHART_PRESENTATION_SETTINGS.margins.bottomPercent),
      },
      rightOffsetBars: Number(rightOffsetBars ?? DEFAULT_CHART_PRESENTATION_SETTINGS.rightOffsetBars),
      candleStyle: cloneCandleStyle(candleStyle),
      gridStyle: cloneGridStyle(gridStyle),
      crosshairStyle: cloneCrosshairStyle(crosshairStyle),
      backgroundStyle: cloneBackgroundStyle(backgroundStyle),
      scaleStyle: cloneScaleStyle(scaleStyle),
      watermarkStyle: cloneWatermarkStyle(watermarkStyle),
    };
    state.viewportFollow = {
      ...state.viewportFollow,
      rightOffsetBars: state.displayContext.rightOffsetBars,
    };
    state.viewportDemand = computeViewportDemand(state);
    rerenderMountedHosts();
    return {
      displayContext: structuredClone(state.displayContext),
      viewportDemand: state.viewportDemand ? structuredClone(state.viewportDemand) : null,
    };
  }

  function updateDisplayTimezoneContext(payload = {}) {
    return setDisplayContext({
      displayTimezone: payload.displayTimezone,
      exchangeTimezone: payload.exchangeTimezone,
    });
  }

  function updatePresentationContext(payload = {}) {
    return setDisplayContext({
      timeFormat: payload.timeFormat,
      dateFormat: payload.dateFormat,
      showDayOfWeekLabels: payload.showDayOfWeekLabels,
      showCrosshairReadout: payload.showCrosshairReadout,
      margins: payload.margins,
      rightOffsetBars: payload.rightOffsetBars,
      candleStyle: payload.candleStyle,
      gridStyle: payload.gridStyle,
      crosshairStyle: payload.crosshairStyle,
      backgroundStyle: payload.backgroundStyle,
      scaleStyle: payload.scaleStyle,
      watermarkStyle: payload.watermarkStyle,
    });
  }

  function getViewportDemand() {
    state.viewportDemand = computeViewportDemand(state);
    return {
      viewportDemand: state.viewportDemand ? structuredClone(state.viewportDemand) : null,
    };
  }

  function start({ root, emitEvent } = {}) {
    rootElement = root;
    emit = emitEvent || emit;
    unregisterCallbacks.push(
      registerCommand(CHART_COMMANDS.REPLACE_BARS, ({ bars } = {}) => updateBars(normalizeBars(bars))),
      registerCommand(CHART_COMMANDS.APPEND_BARS, ({ bars } = {}) => updateBars([
        ...state.bars,
        ...normalizeBars(bars),
      ])),
      registerCommand(CHART_COMMANDS.CLEAR_BARS, () => updateBars([])),
      registerCommand(CHART_COMMANDS.GET_VIEWPORT_METRICS, () => getViewportMetrics()),
      registerCommand(CHART_COMMANDS.SET_RIGHT_EDGE_LIMIT, (payload) => setRightEdgeLimit(payload)),
      registerCommand(CHART_COMMANDS.SET_VISIBLE_RANGE, (payload) => updateVisibleRange(payload)),
      registerCommand(CHART_COMMANDS.GET_VISIBLE_RANGE, () => getVisibleRange()),
      registerCommand(CHART_COMMANDS.SET_DISPLAY_CONTEXT, (payload) => setDisplayContext(payload)),
      registerCommand(CHART_COMMANDS.SET_VIEWPORT_FOLLOW, (payload) => setViewportFollow(payload)),
      registerCommand(CHART_COMMANDS.SET_MANUAL_VISIBLE_RANGE, (payload) => setManualVisibleRange(payload)),
      registerCommand(CHART_COMMANDS.GO_TO_TIME, (payload) => goToTime(payload)),
      registerCommand(CHART_COMMANDS.ZOOM_VISIBLE_RANGE, (payload) => zoomVisibleRange(payload)),
      registerCommand(CHART_COMMANDS.PAN_VISIBLE_RANGE, (payload) => panVisibleRange(payload)),
      registerCommand(CHART_COMMANDS.RESUME_VIEWPORT_FOLLOW, () => resumeViewportFollow()),
      registerCommand(CHART_COMMANDS.GET_RENDERED_BARS, () => getRenderedBars()),
      registerCommand(CHART_COMMANDS.GET_INTERACTION_STATE, () => getInteractionState()),
      registerCommand(CHART_COMMANDS.GET_CROSSHAIR_STATE, () => getCrosshairState()),
      registerCommand(CHART_COMMANDS.GET_VIEWPORT_DEMAND, () => getViewportDemand()),
      registerCommand(CHART_COMMANDS.GET_PREFIX_DEMAND, () => getPrefixDemand()),
      subscribeEvent(DISPLAY_TIMEZONE_EVENTS.CHANGED, (payload) => updateDisplayTimezoneContext(payload)),
      subscribeEvent(CHART_PRESENTATION_EVENTS.CHANGED, (payload) => updatePresentationContext(payload))
    );
    mountAvailableHosts();

    observer = new MutationObserver(() => {
      mountAvailableHosts();
    });
    observer.observe(rootElement, {
      childList: true,
      subtree: true,
    });
  }

  function stop() {
    observer?.disconnect();
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    for (const adapter of chartAdapters.values()) {
      adapter.destroy();
    }
    chartAdapters.clear();
    mountedHosts.clear();
    mountedHostList.clear();
    observer = null;
    rootElement = null;
  }

  return {
    id: 'runtime.chart',
    start,
    stop,
  };
}
