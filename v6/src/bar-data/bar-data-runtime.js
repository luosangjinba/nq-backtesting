import { BAR_DATA_COMMANDS, BAR_DATA_EVENTS } from '../contracts/app-contracts.js';
import { registerCommand } from '../runtime/commands.js';
import { normalizeBars } from './bar-normalizer.js';
import { createBarWindowCache } from './bar-window-cache.js';
import { normalizeBarWindow, planBarWindow, windowBoundsMs } from './bar-window.js';
import { createTargetBarWindowCache } from './target-bar-window-cache.js';
import { normalizeTargetBarWindow } from './target-bar-window.js';
import { fetchV4Bars } from './v4-bars-adapter.js';
import { fetchV4TargetBars } from './v4-target-bars-adapter.js';
import { unixMillisecondsToSeconds } from '../time-domain/time-domain.js';

function filterBarsForWindow(bars = [], planned) {
  const { startMs, endMs } = windowBoundsMs(planned);
  const startTimestamp = unixMillisecondsToSeconds(startMs, {
    fieldName: 'Bar data runtime window startMs',
  });
  const endTimestamp = unixMillisecondsToSeconds(endMs, {
    fieldName: 'Bar data runtime window endMs',
  });
  return normalizeBars(bars).filter((bar) => (
    bar.timestamp >= startTimestamp && bar.timestamp <= endTimestamp
  ));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createBarDataRuntime({
  cache = null,
  fetchBars = fetchV4Bars,
  fetchTargetBars = fetchV4TargetBars,
  fetchRetryDelayMs = 120,
  fetchRetryLimit = 2,
  maxBarsPerWindow = 500,
  maxTargetBarsPerWindow = 1000,
  targetCache = null,
} = {}) {
  const windowCache = cache || createBarWindowCache({ maxBarsPerWindow });
  const targetWindowCache = targetCache || createTargetBarWindowCache({ maxBarsPerWindow: maxTargetBarsPerWindow });
  const unregisterCallbacks = [];

  function normalizeWindow(payload = {}) {
    return normalizeBarWindow(payload, { maxBarsPerWindow });
  }

  function normalizeTargetWindow(payload = {}) {
    return normalizeTargetBarWindow(payload, { maxBarsPerWindow: maxTargetBarsPerWindow });
  }

  async function fetchWithRetry(fetcher, planned) {
    let response = null;
    let lastError = null;
    for (let attempt = 0; attempt <= fetchRetryLimit; attempt += 1) {
      try {
        response = await fetcher(planned);
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (attempt >= fetchRetryLimit) break;
        await sleep(fetchRetryDelayMs * (attempt + 1));
      }
    }
    if (lastError) throw lastError;
    return response;
  }

  async function loadWindow(payload = {}) {
    const planned = normalizeWindow(payload);
    const cached = windowCache.get(planned);
    if (cached) {
      return cached;
    }

    const response = await fetchWithRetry(fetchBars, planned);
    return windowCache.put(planned, {
      bars: filterBarsForWindow(response.bars, planned),
      history: response.history || null,
      requestedRange: response.requestedRange || null,
      timing: response.timing || null,
    });
  }

  async function loadTargetWindow(payload = {}) {
    const planned = normalizeTargetWindow(payload);
    const cached = targetWindowCache.get(planned);
    if (cached) {
      return cached;
    }

    const response = await fetchWithRetry(fetchTargetBars, planned);
    return targetWindowCache.put(planned, {
      bars: response.bars,
      requestedRange: response.requestedRange || null,
      timing: response.timing || null,
    });
  }

  function start({ emitEvent } = {}) {
    unregisterCallbacks.push(
      registerCommand(BAR_DATA_COMMANDS.PLAN_WINDOW, (payload = {}) => (
        planBarWindow(payload, { maxBarsPerWindow })
      )),
      registerCommand(BAR_DATA_COMMANDS.PLAN_TARGET_WINDOW, (payload = {}) => (
        normalizeTargetWindow(payload)
      )),
      registerCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, async (payload = {}) => {
        const record = await loadWindow(payload);
        if (!record.cacheHit) {
          emitEvent?.(BAR_DATA_EVENTS.WINDOW_LOADED, record);
        }
        return record;
      }),
      registerCommand(BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW, async (payload = {}) => {
        const record = await loadTargetWindow(payload);
        if (!record.cacheHit) {
          emitEvent?.(BAR_DATA_EVENTS.TARGET_WINDOW_LOADED, record);
        }
        return record;
      }),
      registerCommand(BAR_DATA_COMMANDS.GET_WINDOW, (payload = {}) => windowCache.get(payload)),
      registerCommand(BAR_DATA_COMMANDS.GET_TARGET_WINDOW, (payload = {}) => targetWindowCache.get(payload)),
      registerCommand(BAR_DATA_COMMANDS.RELEASE_WINDOW, (payload = {}) => {
        const result = windowCache.release(payload);
        if (result.released) {
          emitEvent?.(BAR_DATA_EVENTS.WINDOW_RELEASED, result);
        }
        return result;
      }),
      registerCommand(BAR_DATA_COMMANDS.RELEASE_TARGET_WINDOW, (payload = {}) => {
        const result = targetWindowCache.release(payload);
        if (result.released) {
          emitEvent?.(BAR_DATA_EVENTS.TARGET_WINDOW_RELEASED, result);
        }
        return result;
      }),
      registerCommand(BAR_DATA_COMMANDS.GET_BOUNDARY_METADATA, (payload = {}) => (
        windowCache.boundaryMetadata(payload)
      )),
      registerCommand(BAR_DATA_COMMANDS.GET_TARGET_CACHE_SUMMARY, () => targetWindowCache.summary()),
      registerCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY, () => windowCache.summary())
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
