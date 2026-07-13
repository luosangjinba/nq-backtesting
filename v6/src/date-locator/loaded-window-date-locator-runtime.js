import {
  CHART_DATA_COMMANDS,
  CHART_VIEWPORT_COMMANDS,
  LOADED_WINDOW_DATE_LOCATOR_COMMANDS,
  LOADED_WINDOW_DATE_LOCATOR_EVENTS,
  PANE_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand, registerCommand } from '../runtime/commands.js';
import { planLoadedWindowDateLocation } from './loaded-window-date-locator-domain.js';

const INITIAL_STATE = Object.freeze({
  paneId: null,
  reason: null,
  requestedTimestamp: null,
  status: 'idle',
});

function cloneState(state) {
  return {
    ...state,
    measurement: state.measurement ? { ...state.measurement } : undefined,
    projection: state.projection ? { ...state.projection } : undefined,
    range: state.range ? { ...state.range } : undefined,
  };
}

function spanBarsFromViewport(viewport, requestedSpanBars) {
  return requestedSpanBars
    ?? viewport?.projection?.spanBars
    ?? viewport?.intent?.spanBars
    ?? 120;
}

export function createLoadedWindowDateLocatorRuntime({
  dispatchCommand = dispatchRuntimeCommand,
} = {}) {
  const unregisterCallbacks = [];
  let state = INITIAL_STATE;

  function start({ emitEvent } = {}) {
    const emit = emitEvent || (() => {});
    unregisterCallbacks.push(
      registerCommand(LOADED_WINDOW_DATE_LOCATOR_COMMANDS.GET_STATE, () => cloneState(state)),
      registerCommand(LOADED_WINDOW_DATE_LOCATOR_COMMANDS.LOCATE, async (payload = {}) => {
        const activePane = payload.paneId
          ? { id: payload.paneId }
          : await dispatchCommand(PANE_COMMANDS.GET_ACTIVE);
        const paneId = String(activePane?.id || '').trim();
        if (!paneId) {
          state = Object.freeze({
            paneId: null,
            reason: 'no-active-pane',
            requestedTimestamp: payload.requestedTimestamp ?? null,
            status: 'rejected',
          });
          emit(LOADED_WINDOW_DATE_LOCATOR_EVENTS.REJECTED, cloneState(state));
          return cloneState(state);
        }

        const [chartRecord, viewport] = await Promise.all([
          dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId }),
          dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId }),
        ]);
        if (!viewport) {
          state = Object.freeze({
            paneId,
            reason: 'viewport-unavailable',
            requestedTimestamp: payload.requestedTimestamp ?? null,
            status: 'rejected',
          });
          emit(LOADED_WINDOW_DATE_LOCATOR_EVENTS.REJECTED, cloneState(state));
          return cloneState(state);
        }

        const plan = planLoadedWindowDateLocation({
          bars: chartRecord?.bars || [],
          requestedTimestamp: payload.requestedTimestamp,
          spanBars: spanBarsFromViewport(viewport, payload.spanBars),
        });
        if (plan.status === 'rejected') {
          state = Object.freeze({ ...plan, paneId });
          emit(LOADED_WINDOW_DATE_LOCATOR_EVENTS.REJECTED, cloneState(state));
          return cloneState(state);
        }

        await dispatchCommand(CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT, {
          paneId,
          ...plan.measurement,
        });
        const projected = await dispatchCommand(CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION, {
          chartBarsRevision: chartRecord.revision,
          latestLogicalIndex: plan.latestLogicalIndex,
          paneId,
        });
        state = Object.freeze({
          ...plan,
          chartBarsRevision: chartRecord.revision,
          paneId,
          projection: projected?.projection || plan.range,
        });
        emit(LOADED_WINDOW_DATE_LOCATOR_EVENTS.LOCATED, cloneState(state));
        return cloneState(state);
      }),
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
  }

  return Object.freeze({
    id: 'runtime.loaded-window-date-locator',
    start,
    stop,
  });
}
