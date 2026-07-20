import { createRawBarRequest } from '../bar-data-contract/public.js';
import { createV4BarsProvider, V4_BARS_DATASET_REVISION } from '../v4-bars-provider-adapter/public.js';
import { createFoundationCapabilities, FOUNDATION_IDS } from './foundation-capabilities.js';
const MINUTE = 60_000;
const ENTRY_PREFIX_BARS = 120;
const LEFT_EXTENSION_SOURCE_BARS = 2_500;

/** Concrete R4.5 one-pane capability fixture, isolated outside all core owners. */
export function createFoundationMarket(record, { provider = createV4BarsProvider() } = {}) {
  const capabilities = createFoundationCapabilities();
  const range = record.configuration.historicalRange;
  const contextStartEpochMs = Math.max(0, range.startEpochMs - (ENTRY_PREFIX_BARS * MINUTE));
  function requestThrough(exclusiveEndEpochMs) {
    const boundedEnd = Math.min(range.endEpochMs, Math.max(range.startEpochMs + MINUTE, exclusiveEndEpochMs));
    return createRawBarRequest({
      datasetRevision: V4_BARS_DATASET_REVISION,
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
      datasetRevision: V4_BARS_DATASET_REVISION,
      instrumentId: FOUNDATION_IDS.instrument,
      providerId: FOUNDATION_IDS.provider,
      schemaVersion: 1,
      sourceResolutionId: FOUNDATION_IDS.resolution,
      windowEndEpochMs,
      windowStartEpochMs: Math.max(0, windowEndEpochMs - (LEFT_EXTENSION_SOURCE_BARS * MINUTE)),
    });
  }
  const request = requestThrough(range.startEpochMs + MINUTE);
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
    dispose: () => provider.dispose?.(),
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
