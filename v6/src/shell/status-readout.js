import {
  CHART_DATA_EVENTS,
  CHART_SURFACE_EVENTS,
  DEFAULT_WALL_EVENTS,
  REPLAY_EVENTS,
} from '../contracts/app-contracts.js';
import { subscribeEvent as subscribeRuntimeEvent } from '../runtime/events.js';
import {
  createStatusReadoutState,
  statusReadoutStateFromChartDataPayload,
  statusReadoutStateFromCrosshairPayload,
  statusReadoutStateFromDefaultWallPayload,
  statusReadoutStateFromReplayPayload,
} from './status-readout-model.js';

function setText(root, selector, value) {
  const element = root.querySelector(selector);
  if (element) {
    element.textContent = value;
  }
}

function renderStatusReadout(root, state) {
  setText(root, '[data-v6-status-symbol]', state.symbol);
  setText(root, '[data-v6-status-timeframe]', state.timeframe);
  setText(root, '[data-v6-status-title]', state.title);
  setText(root, '[data-v6-status-price]', state.ohlc.close.replace(/^C /, ''));
  setText(root, '[data-v6-status-open]', state.ohlc.open);
  setText(root, '[data-v6-status-high]', state.ohlc.high);
  setText(root, '[data-v6-status-low]', state.ohlc.low);
  setText(root, '[data-v6-status-close]', state.ohlc.close);
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
}

export function mountStatusReadout(root, {
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
  );

  setState(state);

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
