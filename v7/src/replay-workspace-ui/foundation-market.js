import { createRawBarBatch, createRawBarRequest } from '../bar-data-contract/public.js';
import { createFoundationCapabilities, FOUNDATION_IDS } from './foundation-capabilities.js';
const PRICE_TICK = 0.25;
const MINUTE = 60_000;
const ENTRY_PREFIX_BARS = 120;
const LEFT_EXTENSION_SOURCE_BARS = 2_500;

function alignPrice(value) {
  return Math.round(value / PRICE_TICK) * PRICE_TICK;
}

function sampleMinute(minute, salt) {
  let value = Math.imul((minute ^ salt) >>> 0, 0x45d9f3b);
  value = Math.imul((value ^ (value >>> 16)) >>> 0, 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 0x1_0000_0000;
}

function closeAt(minute) {
  const structure = (Math.sin(minute / 5.5) * 3)
    + (Math.sin(minute / 17) * 6)
    + (Math.sin(minute / 61) * 10)
    + (Math.sin(minute / 193) * 14);
  return alignPrice(20_000 + structure + ((sampleMinute(minute, 0x51f15e) - 0.5) * 4));
}

function generateBars(request) {
  const bars = [];
  for (let epoch = request.windowStartEpochMs; epoch < request.windowEndEpochMs; epoch += MINUTE) {
    const minute = Math.floor(epoch / MINUTE);
    const open = closeAt(minute - 1);
    const close = closeAt(minute);
    const wick = (salt, rareSalt) => {
      let steps = Math.floor((sampleMinute(minute, salt) ** 3) * 6);
      if (sampleMinute(minute, rareSalt) > 0.992) {
        steps += 4 + Math.floor(sampleMinute(minute, rareSalt ^ 0x5bd1e9) * 5);
      }
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
      volume: 70 + Math.floor(sampleMinute(minute, 0xbb67ae) * 170),
    });
  }
  return bars;
}

/** Concrete R4.5 one-pane capability fixture, isolated outside all core owners. */
export function createFoundationMarket(record) {
  const capabilities = createFoundationCapabilities();
  const range = record.configuration.historicalRange;
  const contextStartEpochMs = Math.max(0, range.startEpochMs - (ENTRY_PREFIX_BARS * MINUTE));
  function requestThrough(exclusiveEndEpochMs) {
    const boundedEnd = Math.min(range.endEpochMs, Math.max(range.startEpochMs + MINUTE, exclusiveEndEpochMs));
    return createRawBarRequest({
      datasetRevision: 'foundation-r3',
      instrumentId: FOUNDATION_IDS.instrument,
      providerId: FOUNDATION_IDS.provider,
      schemaVersion: 1,
      sourceResolutionId: FOUNDATION_IDS.resolution,
      windowEndEpochMs: boundedEnd,
      windowStartEpochMs: contextStartEpochMs,
    });
  }
  function requestBefore(oldestEpochMs) {
    const windowEndEpochMs = Math.max(MINUTE, oldestEpochMs);
    return createRawBarRequest({
      datasetRevision: 'foundation-r3',
      instrumentId: FOUNDATION_IDS.instrument,
      providerId: FOUNDATION_IDS.provider,
      schemaVersion: 1,
      sourceResolutionId: FOUNDATION_IDS.resolution,
      windowEndEpochMs,
      windowStartEpochMs: Math.max(0, windowEndEpochMs - (LEFT_EXTENSION_SOURCE_BARS * MINUTE)),
    });
  }
  const request = requestThrough(range.startEpochMs + MINUTE);
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
    for (let epochMs = cursorEpochMs; epochMs < range.endEpochMs; epochMs += MINUTE) {
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
    const targetEpochMs = Math.min(range.endEpochMs, lastEligibleEpochMs + MINUTE);
    return Object.freeze({ durationMs: targetEpochMs - cursorEpochMs, request: requestThrough(targetEpochMs) });
  }
  return Object.freeze({
    ...capabilities,
    entryAdvanceMs: MINUTE,
    ids: FOUNDATION_IDS,
    planEligibleMinutes,
    provider,
    request,
    requestBefore,
    requestThrough,
  });
}

export function supportsFoundationWorkspace(record) {
  return record?.configuration?.instrumentIds?.includes(FOUNDATION_IDS.instrument) === true;
}
