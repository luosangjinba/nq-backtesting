import { createRawBarRequest } from '../bar-data-contract/public.js';
import { createV4BarsProvider, V4_BARS_DATASET_REVISION } from '../v4-bars-provider-adapter/public.js';
import { createFoundationCapabilities, FOUNDATION_IDS } from './foundation-capabilities.js';
const MINUTE = 60_000;
const ENTRY_PREFIX_BARS = 120;
const FORWARD_BUFFER_SOURCE_BARS = 500;
const MINIMUM_HISTORY_SOURCE_BARS = 240;
const TARGET_HISTORY_DISPLAY_BARS = 240;
const MAXIMUM_REQUEST_SOURCE_BARS = 35 * 24 * 60;

/** Concrete NQ-primary Session market composition, isolated outside all core owners. */
export function createFoundationMarket(record, { provider = createV4BarsProvider() } = {}) {
  const configuredInstrumentIds = record?.configuration?.instrumentIds ?? [FOUNDATION_IDS.instrument];
  const capabilities = createFoundationCapabilities(configuredInstrumentIds);
  const range = record.configuration.historicalRange;
  const contextStartEpochMs = Math.max(0, range.startEpochMs - (ENTRY_PREFIX_BARS * MINUTE));
  function historySourceBars(selection) {
    const durationMs = selection?.displayTimeframe?.alignment?.durationMs ?? MINUTE;
    return Math.min(
      MAXIMUM_REQUEST_SOURCE_BARS,
      Math.max(MINIMUM_HISTORY_SOURCE_BARS, Math.ceil(durationMs / MINUTE) * TARGET_HISTORY_DISPLAY_BARS),
    );
  }
  function usesEntryPrefix(selection) {
    return selection?.displayTimeframe?.id === capabilities.defaultTarget.timeframeId
      && selection?.sessionHoursMode === capabilities.defaultTarget.sessionHoursMode;
  }
  function rawRequest({ instrumentId, windowEndEpochMs, windowStartEpochMs }) {
    return createRawBarRequest({
      datasetRevision: V4_BARS_DATASET_REVISION,
      instrumentId,
      providerId: FOUNDATION_IDS.provider,
      schemaVersion: 1,
      sourceResolutionId: FOUNDATION_IDS.resolution,
      windowEndEpochMs,
      windowStartEpochMs,
    });
  }
  function isEligibleMinute(epochMs, selection) {
    return selection.sessionHoursPolicy.isEligible({ startEpochMs: epochMs }, {
      calendar: selection.calendar,
      instrument: selection.instrument,
      sessionHoursMode: selection.sessionHoursMode,
    });
  }
  function contributingHistoryStart(windowEndEpochMs, sourceBars, selection) {
    const boundedStart = Math.max(0, windowEndEpochMs - (MAXIMUM_REQUEST_SOURCE_BARS * MINUTE));
    const nominalStart = Math.max(boundedStart, windowEndEpochMs - (sourceBars * MINUTE));
    for (let epochMs = windowEndEpochMs - MINUTE; epochMs >= nominalStart; epochMs -= MINUTE) {
      if (isEligibleMinute(epochMs, selection)) return nominalStart;
    }
    let requiredEligibleBars = Math.min(MINIMUM_HISTORY_SOURCE_BARS, sourceBars);
    for (let epochMs = nominalStart - MINUTE; epochMs >= boundedStart; epochMs -= MINUTE) {
      if (!isEligibleMinute(epochMs, selection)) continue;
      requiredEligibleBars -= 1;
      if (requiredEligibleBars === 0) return epochMs;
    }
    return boundedStart;
  }
  function requestThrough(exclusiveEndEpochMs, selection = capabilities.defaultSelection) {
    const requiredBars = Math.max(1, Math.ceil((exclusiveEndEpochMs - range.startEpochMs) / MINUTE));
    const bufferedBars = Math.ceil(requiredBars / FORWARD_BUFFER_SOURCE_BARS) * FORWARD_BUFFER_SOURCE_BARS;
    const boundedEnd = Math.min(range.endEpochMs, range.startEpochMs + (bufferedBars * MINUTE));
    const desiredStart = range.startEpochMs - (historySourceBars(selection) * MINUTE);
    const boundedStart = Math.max(0, boundedEnd - (MAXIMUM_REQUEST_SOURCE_BARS * MINUTE));
    return rawRequest({
      instrumentId: selection.instrument.id,
      windowEndEpochMs: boundedEnd,
      windowStartEpochMs: usesEntryPrefix(selection)
        ? contextStartEpochMs
        : Math.max(desiredStart, boundedStart),
    });
  }
  function requestBefore(oldestEpochMs, selection = capabilities.defaultSelection) {
    const windowEndEpochMs = Math.max(MINUTE, oldestEpochMs);
    const sourceBars = historySourceBars(selection);
    return rawRequest({
      instrumentId: selection.instrument.id,
      windowEndEpochMs,
      windowStartEpochMs: contributingHistoryStart(windowEndEpochMs, sourceBars, selection),
    });
  }
  const request = requestThrough(range.startEpochMs + MINUTE);
  function planEligibleMinutes({ count, cursorEpochMs, selection }) {
    let remaining = count;
    let lastEligibleEpochMs = null;
    for (let epochMs = cursorEpochMs; epochMs < range.endEpochMs; epochMs += MINUTE) {
      if (isEligibleMinute(epochMs, selection)) {
        lastEligibleEpochMs = epochMs;
        remaining -= 1;
        if (remaining === 0) break;
      }
    }
    if (lastEligibleEpochMs === null) throw Object.assign(new Error('No later eligible minute exists in this Session.'), {
      code: 'foundation-session-complete',
    });
    const targetEpochMs = Math.min(range.endEpochMs, lastEligibleEpochMs + MINUTE);
    return Object.freeze({
      durationMs: targetEpochMs - cursorEpochMs,
      request: requestThrough(targetEpochMs, selection),
    });
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
    requestWindow: rawRequest,
  });
}

export function supportsFoundationWorkspace(record) {
  const instrumentIds = record?.configuration?.instrumentIds;
  const supported = new Set(Object.values(FOUNDATION_IDS.instruments));
  return Array.isArray(instrumentIds) && instrumentIds.length > 0
    && instrumentIds.includes(FOUNDATION_IDS.instrument)
    && instrumentIds.every((id) => supported.has(id));
}
