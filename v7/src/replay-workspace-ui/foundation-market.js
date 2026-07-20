import { createRawBarBatch, createRawBarRequest } from '../bar-data-contract/public.js';
import { createFoundationCapabilities, FOUNDATION_IDS } from './foundation-capabilities.js';
const PRICE_TICK = 0.25;

function alignPrice(value) {
  return Math.round(value / PRICE_TICK) * PRICE_TICK;
}

function generateBars(request) {
  const bars = [];
  let previousClose = 20_000;
  for (let epoch = request.windowStartEpochMs; epoch < request.windowEndEpochMs; epoch += 60_000) {
    const minute = Math.floor(epoch / 60_000);
    const sample = (salt) => {
      let value = Math.imul((minute ^ salt) >>> 0, 0x45d9f3b);
      value = Math.imul((value ^ (value >>> 16)) >>> 0, 0x45d9f3b);
      return ((value ^ (value >>> 16)) >>> 0) / 0x1_0000_0000;
    };
    const open = previousClose;
    const balancedMove = sample(0x51f15e) + sample(0x9e3779) + sample(0x243f6a) - 1.5;
    const regime = Math.sin(minute / 47) * 0.35;
    const close = alignPrice(open + regime + (balancedMove * 5.2));
    const wick = (salt, rareSalt) => {
      let steps = 1 + Math.floor((sample(salt) ** 5) * 7);
      if (sample(rareSalt) > 0.992) steps += 8 + Math.floor(sample(rareSalt ^ 0x5bd1e9) * 8);
      return steps * PRICE_TICK;
    };
    const upperWick = wick(0x7f4a7c, 0xa54ff5);
    const lowerWick = wick(0x6a09e6, 0x510e52);
    bars.push({
      close,
      high: alignPrice(Math.max(open, close) + upperWick),
      low: alignPrice(Math.min(open, close) - lowerWick),
      open,
      startEpochMs: epoch,
      volume: 70 + Math.floor(sample(0xbb67ae) * 170),
    });
    previousClose = close;
  }
  return bars;
}

/** Concrete R4.5 one-pane capability fixture, isolated outside all core owners. */
export function createFoundationMarket(record) {
  const capabilities = createFoundationCapabilities();
  const range = record.configuration.historicalRange;
  const requestEnd = Math.min(range.endEpochMs, range.startEpochMs + (360 * 60_000));
  function requestThrough(exclusiveEndEpochMs) {
    const boundedEnd = Math.min(range.endEpochMs, Math.max(requestEnd, exclusiveEndEpochMs));
    return createRawBarRequest({
    datasetRevision: 'foundation-r1',
    instrumentId: FOUNDATION_IDS.instrument,
    providerId: FOUNDATION_IDS.provider,
    schemaVersion: 1,
    sourceResolutionId: FOUNDATION_IDS.resolution,
    windowEndEpochMs: boundedEnd,
    windowStartEpochMs: range.startEpochMs,
    });
  }
  const request = requestThrough(requestEnd);
  const provider = Object.freeze({
    requestRawBars: (rawRequest) => createRawBarBatch({
      bars: generateBars(rawRequest),
      request: rawRequest,
      schemaVersion: 1,
    }),
  });
  function planEligibleMinutes({ count, cursorEpochMs, selection }) {
    let remaining = count;
    let lastEligibleEpochMs = null;
    for (let epochMs = cursorEpochMs; epochMs < range.endEpochMs; epochMs += 60_000) {
      if (selection.sessionHoursPolicy.isEligible({ startEpochMs: epochMs }, {
        calendar: selection.calendar,
        instrument: selection.instrument,
        sessionHoursMode: selection.sessionHoursMode,
      })) {
        lastEligibleEpochMs = epochMs;
        remaining -= 1;
        if (remaining === 0) break;
      }
    }
    if (lastEligibleEpochMs === null) throw Object.assign(new Error('No later eligible minute exists in this Session.'), {
      code: 'foundation-session-complete',
    });
    const targetEpochMs = Math.min(range.endEpochMs, lastEligibleEpochMs + 60_000);
    return Object.freeze({ durationMs: targetEpochMs - cursorEpochMs, request: requestThrough(targetEpochMs) });
  }
  return Object.freeze({ ...capabilities, ids: FOUNDATION_IDS, planEligibleMinutes, provider, request, requestThrough });
}

export function supportsFoundationWorkspace(record) {
  return record?.configuration?.instrumentIds?.includes(FOUNDATION_IDS.instrument) === true;
}
