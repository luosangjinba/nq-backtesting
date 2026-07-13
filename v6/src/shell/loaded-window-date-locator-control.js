import { LOADED_WINDOW_DATE_LOCATOR_COMMANDS } from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { parseLoadedWindowDateTimeLocal } from '../date-locator/loaded-window-date-locator-input.js';

function formatTimestamp(timestamp) {
  if (!Number.isFinite(Number(timestamp))) return 'unknown';
  return new Date(Number(timestamp) * 1000).toISOString().replace('T', ' ').replace(':00.000Z', ' UTC');
}

function statusMessage(state) {
  if (state.status === 'located') {
    return `Located ${formatTimestamp(state.resolvedTimestamp)} in ${state.paneId}.`;
  }
  if (state.reason === 'outside-loaded-window') {
    return `Outside loaded window (${formatTimestamp(state.loadedStartTimestamp)} – ${formatTimestamp(state.loadedEndTimestamp)}).`;
  }
  if (state.reason === 'no-loaded-bars') return 'The active pane has no loaded bars.';
  if (state.reason === 'viewport-unavailable') return 'The active pane viewport is not ready.';
  if (state.reason === 'no-active-pane') return 'No active chart pane is available.';
  return 'Unable to locate that date in loaded data.';
}

export function mountLoadedWindowDateLocatorControl(root, {
  dispatchCommand = dispatchRuntimeCommand,
} = {}) {
  if (!root) throw new Error('Loaded-window date locator root is required.');
  const form = root.querySelector('[data-v6-loaded-window-date-locator-form]');
  const input = root.querySelector('[data-v6-loaded-window-date-locator-input]');
  const status = root.querySelector('[data-v6-loaded-window-date-locator-status]');
  if (!form || !input || !status) {
    throw new Error('Loaded-window date locator control is incomplete.');
  }

  const abortController = new AbortController();
  let state = Object.freeze({ message: 'Uses the active pane’s loaded bars only.', status: 'idle' });

  function render(nextState) {
    state = Object.freeze({ ...nextState });
    status.textContent = state.message;
    status.dataset.status = state.status;
    root.dataset.loadedWindowDateLocatorStatus = state.status;
  }

  async function locate(value = input.value) {
    try {
      render({ message: 'Locating…', status: 'pending' });
      const result = await dispatchCommand(LOADED_WINDOW_DATE_LOCATOR_COMMANDS.LOCATE, {
        requestedTimestamp: parseLoadedWindowDateTimeLocal(value),
      });
      render({ ...result, message: statusMessage(result) });
      return result;
    } catch (error) {
      const failed = {
        message: error?.message || String(error),
        reason: 'invalid-input',
        status: 'rejected',
      };
      render(failed);
      return failed;
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    locate();
  }, { signal: abortController.signal });
  render(state);

  return Object.freeze({
    destroy() {
      abortController.abort();
    },
    getState() {
      return { ...state };
    },
    locate,
  });
}
