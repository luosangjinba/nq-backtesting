import { BAR_DATA_COMMANDS, BAR_DATA_EVENTS } from '../contracts/app-contracts.js';
import { registerCommand } from '../runtime/commands.js';
import { normalizeBars } from './bar-normalizer.js';
import { createBarWindowCache } from './bar-window-cache.js';
import { normalizeBarWindow, planBarWindow } from './bar-window.js';
import { fetchV4Bars } from './v4-bars-adapter.js';

export function createBarDataRuntime({
  cache = createBarWindowCache(),
  fetchBars = fetchV4Bars,
  maxBarsPerWindow = 500,
} = {}) {
  const unregisterCallbacks = [];

  function normalizeWindow(payload = {}) {
    return normalizeBarWindow(payload, { maxBarsPerWindow });
  }

  async function loadWindow(payload = {}) {
    const planned = normalizeWindow(payload);
    const cached = cache.get(planned);
    if (cached) {
      return cached;
    }

    const response = await fetchBars(planned);
    return cache.put(planned, {
      bars: normalizeBars(response.bars),
      requestedRange: response.requestedRange || null,
      timing: response.timing || null,
    });
  }

  function start({ emitEvent } = {}) {
    unregisterCallbacks.push(
      registerCommand(BAR_DATA_COMMANDS.PLAN_WINDOW, (payload = {}) => (
        planBarWindow(payload, { maxBarsPerWindow })
      )),
      registerCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, async (payload = {}) => {
        const record = await loadWindow(payload);
        if (!record.cacheHit) {
          emitEvent?.(BAR_DATA_EVENTS.WINDOW_LOADED, record);
        }
        return record;
      }),
      registerCommand(BAR_DATA_COMMANDS.GET_WINDOW, (payload = {}) => cache.get(payload)),
      registerCommand(BAR_DATA_COMMANDS.RELEASE_WINDOW, (payload = {}) => {
        const result = cache.release(payload);
        if (result.released) {
          emitEvent?.(BAR_DATA_EVENTS.WINDOW_RELEASED, result);
        }
        return result;
      }),
      registerCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY, () => cache.summary())
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
  }

  return {
    id: 'runtime.bar-data',
    start,
    stop,
  };
}
