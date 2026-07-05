import { DISPLAY_TIMEFRAME_COMMANDS } from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';

function normalizeDisplayTimeframe(value) {
  const timeframe = Number(value);
  if (!Number.isInteger(timeframe) || timeframe <= 0) {
    throw new Error('Display timeframe control value must be a positive integer.');
  }
  return timeframe;
}

export function mountDisplayTimeframeControl(root, {
  dispatchCommand = dispatchRuntimeCommand,
} = {}) {
  if (!root) {
    throw new Error('Display timeframe control root is required.');
  }
  const select = root.querySelector('[data-v6-display-timeframe-select]');
  if (!select) {
    throw new Error('Display timeframe select is required.');
  }
  const abortController = new AbortController();
  const signal = abortController.signal;

  select.addEventListener('change', () => {
    const displayTimeframe = normalizeDisplayTimeframe(select.value);
    root.dataset.displayTimeframe = String(displayTimeframe);
    Promise.resolve(dispatchCommand(DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
      displayTimeframe,
    })).catch((error) => {
      root.dataset.lastDisplayTimeframeError = error?.message || String(error);
    });
  }, { signal });

  root.dataset.displayTimeframe = String(normalizeDisplayTimeframe(select.value));

  return Object.freeze({
    destroy() {
      abortController.abort();
    },
    getValue() {
      return normalizeDisplayTimeframe(select.value);
    },
  });
}
