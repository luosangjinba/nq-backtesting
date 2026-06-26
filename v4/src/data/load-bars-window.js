import { fetchBars } from '../api.js';
import { fetchBarsWindowCached } from './bars-window-cache.js';

export async function loadBarsWindow(start, end, timeframe, instrument) {
  const { payload, cacheHit, cacheKey } = await fetchBarsWindowCached({
    instrument,
    timeframe,
    start,
    end,
    load: () => fetchBars(start, end, timeframe, instrument),
  });
  return { result: payload, cacheHit, cacheKey };
}
