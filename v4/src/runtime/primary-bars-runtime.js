import * as store from '../data/bar-store.js';
import { loadBars } from '../data/bars/bars-api-client.js';

export function setPrimaryBars({
  bars,
  start,
  end,
  timeframe,
  requestedRange = null,
  outerRange = null,
  instrument,
} = {}) {
  store.setBars(bars || [], start, end, timeframe, requestedRange, {
    outerRange,
    instrument,
  });
  return {
    bars: store.getBars(),
    displayBars: store.getDisplayBars(),
    requestedRange: store.getRequestedRange(),
    requestedOuterRange: store.getRequestedOuterRange(),
  };
}

export async function loadPrimaryBars({
  start,
  end,
  timeframe,
  instrument,
  outerRange = null,
} = {}) {
  const result = await loadBars({
    start,
    end,
    timeframe,
    instrument,
  });
  setPrimaryBars({
    bars: result.bars,
    start,
    end,
    timeframe,
    requestedRange: result.requestedRange,
    outerRange,
    instrument,
  });
  return result;
}
