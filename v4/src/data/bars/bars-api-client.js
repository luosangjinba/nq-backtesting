import { fetchBars } from '../../api.js';
import { normalizeBarsRequest } from './bars-request.js';

export async function loadBars(request = {}) {
  const normalized = normalizeBarsRequest(request);
  return fetchBars(
    normalized.start,
    normalized.end,
    normalized.timeframe,
    normalized.instrument
  );
}
