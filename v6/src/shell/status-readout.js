import {
  CHART_DATA_EVENTS,
  CHART_SURFACE_EVENTS,
  DEFAULT_WALL_EVENTS,
  REPLAY_EVENTS,
  SETTINGS_COMMANDS,
  SETTINGS_EVENTS,
} from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { subscribeEvent as subscribeRuntimeEvent } from '../runtime/events.js';
import {
  createStatusReadoutState,
  statusReadoutStateFromChartDataPayload,
  statusReadoutStateFromCrosshairPayload,
  statusReadoutStateFromDefaultWallPayload,
  statusReadoutStateFromReplayPayload,
  statusReadoutStateWithTimePresentation,
} from './status-readout-model.js';

function setText(root, selector, value) {
  const element = root.querySelector(selector);
  if (element) {
    element.textContent = value;
  }
}

function updateDataset(element, state) {
  if (!element) return;
  if (!element.dataset) {
    element.dataset = {};
  }
  element.dataset.statusCandleDirection = state.candleDirection;
  element.dataset.statusOhlc = state.crosshairBar ? 'selected' : 'empty';
}

function renderStatusReadout(root, state) {
  const hasPaneStatusReadouts = Boolean(root.querySelectorAll?.('[data-v6-pane-status-readout]')?.length);
  const selector = (base, paneLocalAttribute) => (
    hasPaneStatusReadouts ? `${base}:not([${paneLocalAttribute}])` : base
  );
  const readout = root.querySelector(selector('[data-v6-status-readout]', 'data-v6-pane-status-readout'));
  setText(root, selector('[data-v6-status-symbol]', 'data-v6-pane-status-field'), state.symbol);
  setText(root, selector('[data-v6-status-timeframe]', 'data-v6-pane-status-field'), state.timeframe);
  setText(root, '[data-v6-status-title]', state.title);
  setText(root, '[data-v6-status-price]', state.ohlc.close.replace(/^C /, ''));
  setText(root, selector('[data-v6-status-open]', 'data-v6-pane-status-field'), state.ohlc.open);
  setText(root, selector('[data-v6-status-high]', 'data-v6-pane-status-field'), state.ohlc.high);
  setText(root, selector('[data-v6-status-low]', 'data-v6-pane-status-field'), state.ohlc.low);
  setText(root, selector('[data-v6-status-close]', 'data-v6-pane-status-field'), state.ohlc.close);
  setText(root, '[data-v6-footer-session]', state.footer.session);
  setText(root, '[data-v6-footer-start]', state.footer.start);
  setText(root, '[data-v6-footer-cursor]', state.footer.cursor);
  setText(root, '[data-v6-footer-end]', state.footer.end);
  setText(root, '[data-v6-footer-revealed]', state.footer.revealed);
  setText(root, '[data-v6-footer-playback]', state.footer.playback);
  setText(root, '[data-v6-footer-no-future]', state.footer.noFuture);
  root.dataset.statusPlayback = state.playback;
  root.dataset.statusSymbol = state.symbol;
  root.dataset.statusTimeframe = state.timeframe;
  updateDataset(readout, state);
}

export function mountStatusReadout(root, {
  dispatchCommand = dispatchRuntimeCommand,
  subscribeEvent = subscribeRuntimeEvent,
} = {}) {
  if (!root) {
    throw new Error('Status readout root is required.');
  }
  const unsubscriptions = [];
  let state = createStatusReadoutState();

  function setState(nextState) {
    state = nextState;
    renderStatusReadout(root, state);
    return state;
  }

  unsubscriptions.push(
    subscribeEvent(DEFAULT_WALL_EVENTS.LOADED, (payload) => {
      setState(statusReadoutStateFromDefaultWallPayload(payload, state));
    }),
    subscribeEvent(DEFAULT_WALL_EVENTS.ADVANCED, (payload) => {
      setState(statusReadoutStateFromDefaultWallPayload(payload, state));
    }),
    subscribeEvent(CHART_DATA_EVENTS.BARS_CHANGED, (payload) => {
      setState(statusReadoutStateFromChartDataPayload(payload, state));
    }),
    subscribeEvent(CHART_SURFACE_EVENTS.CROSSHAIR_CHANGED, (payload) => {
      setState(statusReadoutStateFromCrosshairPayload(payload, state));
    }),
    subscribeEvent(REPLAY_EVENTS.LOADED, (payload) => {
      setState(statusReadoutStateFromReplayPayload(payload, state));
    }),
    subscribeEvent(REPLAY_EVENTS.ADVANCED, (payload) => {
      setState(statusReadoutStateFromReplayPayload(payload, state));
    }),
    subscribeEvent(REPLAY_EVENTS.RESET, (payload) => {
      setState(statusReadoutStateFromReplayPayload(payload, state));
    }),
    subscribeEvent(REPLAY_EVENTS.PLAYBACK_CHANGED, (payload) => {
      setState(statusReadoutStateFromReplayPayload(payload, state));
    }),
    subscribeEvent(SETTINGS_EVENTS.UPDATED, (settings) => {
      setState(statusReadoutStateWithTimePresentation(state, settings));
    }),
    subscribeEvent(SETTINGS_EVENTS.RESET, (settings) => {
      setState(statusReadoutStateWithTimePresentation(state, settings));
    }),
    subscribeEvent(SETTINGS_EVENTS.DRAFT_PREVIEWED, (settings) => {
      setState(statusReadoutStateWithTimePresentation(state, settings));
    }),
  );

  setState(state);
  Promise.resolve(dispatchCommand(SETTINGS_COMMANDS.GET_SNAPSHOT))
    .then((settings) => setState(statusReadoutStateWithTimePresentation(state, settings)))
    .catch(() => {});

  return Object.freeze({
    destroy() {
      while (unsubscriptions.length) {
        unsubscriptions.pop()();
      }
    },
    getState() {
      return state;
    },
  });
}
