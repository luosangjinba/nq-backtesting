import { createRawBarRequest } from '../bar-data-contract/public.js';
import { createProjectedHistoryRequest } from '../projected-history-contract/public.js';
import {
  createV4BarsProvider,
  createV4ProjectedHistoryProvider,
  V4_BARS_DATASET_REVISION,
  V4_PROJECTED_HISTORY_PROVIDER_ID,
} from '../v4-bars-provider-adapter/public.js';
import { createFoundationCapabilities, FOUNDATION_IDS } from './foundation-capabilities.js';
import { planSingleHistoryWindow } from './history-window-plan.js';
const MINUTE = 60_000;
const ENTRY_PREFIX_BARS = 120;
const FORWARD_BUFFER_SOURCE_BARS = 500;
const MINIMUM_HISTORY_SOURCE_BARS = 240;
const TARGET_HISTORY_DISPLAY_BARS = 240;
const MAXIMUM_REQUEST_SOURCE_BARS = 35 * 24 * 60;
const MAXIMUM_SINGLE_HISTORY_DAYS = 210;
const MAXIMUM_SINGLE_HISTORY_WINDOW_MS = MAXIMUM_SINGLE_HISTORY_DAYS * 24 * 60 * MINUTE;
const MAXIMUM_PROJECTED_HISTORY_WINDOW_MS = 10 * 366 * 24 * 60 * MINUTE;
const PROJECTED_HISTORY_MINIMUM_DURATION_MS = 60 * MINUTE;

/** Concrete NQ-primary Session market composition, isolated outside all core owners. */
export function createFoundationMarket(record, {
  projectedHistoryProvider = createV4ProjectedHistoryProvider(),
  provider = createV4BarsProvider(),
} = {}) {
  const configuredInstrumentIds = record?.configuration?.instrumentIds ?? [FOUNDATION_IDS.instrument];
  const capabilities = createFoundationCapabilities(configuredInstrumentIds);
  const range = record.configuration.historicalRange;
  const contextStartEpochMs = Math.max(0, range.startEpochMs - (ENTRY_PREFIX_BARS * MINUTE));
  const entryHistoryEndEpochMs = range.startEpochMs + MINUTE;
  function targetDisplayBars(value = TARGET_HISTORY_DISPLAY_BARS) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new TypeError('Target display bars must be a positive safe integer.');
    }
    return value;
  }
  function historySourceBars(selection, displayBars = TARGET_HISTORY_DISPLAY_BARS) {
    const durationMs = selection?.displayTimeframe?.alignment?.durationMs ?? MINUTE;
    return Math.min(
      MAXIMUM_REQUEST_SOURCE_BARS,
      Math.max(
        MINIMUM_HISTORY_SOURCE_BARS,
        Math.ceil(durationMs / MINUTE) * targetDisplayBars(displayBars),
      ),
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
  function plannedEntryHistoryStart(selection, displayBars) {
    // Raw Bar identity is intentionally independent of ETH/RTH. Plan the
    // shared entry window against the sparser RTH policy so either projection
    // receives enough source coverage without changing the cache key when the
    // user switches Session Hours.
    const planningSelection = capabilities.catalog.get({
      instrumentId: selection.instrument.id,
      sessionHoursMode: 'rth',
      timeframeId: selection.displayTimeframe.id,
    });
    return planSingleHistoryWindow({
      durationMs: planningSelection.displayTimeframe.alignment.durationMs,
      isEligibleMinute: (epochMs) => isEligibleMinute(epochMs, planningSelection),
      maximumWindowMs: MAXIMUM_REQUEST_SOURCE_BARS * MINUTE,
      targetDisplayBars: targetDisplayBars(displayBars),
      windowEndEpochMs: entryHistoryEndEpochMs,
    });
  }
  function requestThrough(
    exclusiveEndEpochMs,
    selection = capabilities.defaultSelection,
    replacementDisplayBars = null,
  ) {
    const displayBars = targetDisplayBars(
      replacementDisplayBars ?? TARGET_HISTORY_DISPLAY_BARS,
    );
    const requiredBars = Math.max(1, Math.ceil((exclusiveEndEpochMs - range.startEpochMs) / MINUTE));
    const bufferedBars = Math.ceil(requiredBars / FORWARD_BUFFER_SOURCE_BARS) * FORWARD_BUFFER_SOURCE_BARS;
    const boundedEnd = Math.min(range.endEpochMs, range.startEpochMs + (bufferedBars * MINUTE));
    const boundedStart = Math.max(0, boundedEnd - (MAXIMUM_REQUEST_SOURCE_BARS * MINUTE));
    return rawRequest({
      instrumentId: selection.instrument.id,
      windowEndEpochMs: boundedEnd,
      windowStartEpochMs: replacementDisplayBars === null && usesEntryPrefix(selection)
        ? contextStartEpochMs
        : Math.max(plannedEntryHistoryStart(selection, displayBars), boundedStart),
    });
  }
  function requestBefore(
    oldestEpochMs,
    selection = capabilities.defaultSelection,
    targetDisplayBars = TARGET_HISTORY_DISPLAY_BARS,
  ) {
    const windowEndEpochMs = Math.max(MINUTE, oldestEpochMs);
    const durationMs = selection?.displayTimeframe?.alignment?.durationMs ?? MINUTE;
    return rawRequest({
      instrumentId: selection.instrument.id,
      windowEndEpochMs,
      windowStartEpochMs: planSingleHistoryWindow({
        durationMs,
        isEligibleMinute: (epochMs) => isEligibleMinute(epochMs, selection),
        maximumWindowMs: MAXIMUM_SINGLE_HISTORY_WINDOW_MS,
        targetDisplayBars: Math.ceil(targetDisplayBars ?? TARGET_HISTORY_DISPLAY_BARS),
        windowEndEpochMs,
      }),
    });
  }
  function supportsProjectedHistory(selection = capabilities.defaultSelection) {
    return selection?.displayTimeframe?.alignment?.kind === 'fixed-duration'
      && selection.displayTimeframe.alignment.durationMs >= PROJECTED_HISTORY_MINIMUM_DURATION_MS;
  }
  function requiresProjectedReplacementHistory(request, selection, displayBars) {
    if (!supportsProjectedHistory(selection)) return false;
    const plannedStart = plannedEntryHistoryStart(selection, displayBars);
    const hardStart = Math.max(
      0,
      entryHistoryEndEpochMs - (MAXIMUM_REQUEST_SOURCE_BARS * MINUTE),
    );
    return plannedStart <= hardStart || request.windowStartEpochMs > plannedStart;
  }
  function requestProjectedHistoryBefore(
    oldestEpochMs,
    selection = capabilities.defaultSelection,
    targetDisplayBars = TARGET_HISTORY_DISPLAY_BARS,
  ) {
    if (!supportsProjectedHistory(selection)) {
      throw new TypeError('Projected History requires a fixed timeframe of at least one hour.');
    }
    const windowEndEpochMs = Math.max(MINUTE, oldestEpochMs);
    const durationMs = selection.displayTimeframe.alignment.durationMs;
    return createProjectedHistoryRequest({
      aggregationPolicyRevision: selection.aggregationPolicy.revision,
      calendarRevision: selection.calendar.revision,
      datasetRevision: V4_BARS_DATASET_REVISION,
      displayTimeframeId: selection.displayTimeframe.id,
      durationMs,
      instrumentId: selection.instrument.id,
      providerId: V4_PROJECTED_HISTORY_PROVIDER_ID,
      schemaVersion: 1,
      sessionHoursMode: selection.sessionHoursMode,
      windowEndEpochMs,
      windowStartEpochMs: planSingleHistoryWindow({
        durationMs,
        isEligibleMinute: (epochMs) => isEligibleMinute(epochMs, selection),
        maximumWindowMs: MAXIMUM_PROJECTED_HISTORY_WINDOW_MS,
        targetDisplayBars: Math.ceil(targetDisplayBars ?? TARGET_HISTORY_DISPLAY_BARS),
        windowEndEpochMs,
      }),
    });
  }
  function requestForTimeLocation(
    oldestEpochMs,
    targetEpochMs,
    selection = capabilities.defaultSelection,
  ) {
    if (!Number.isSafeInteger(oldestEpochMs) || !Number.isSafeInteger(targetEpochMs)
      || oldestEpochMs <= 0 || targetEpochMs < 0 || targetEpochMs >= oldestEpochMs) {
      throw Object.assign(new Error('Time-location history requires an earlier target epoch.'), {
        code: 'foundation-time-location-history-invalid',
      });
    }
    const sourceBars = historySourceBars(selection);
    const boundedStart = Math.max(0, oldestEpochMs - (MAXIMUM_REQUEST_SOURCE_BARS * MINUTE));
    const targetContextStart = Math.max(0, targetEpochMs - (sourceBars * MINUTE));
    return rawRequest({
      instrumentId: selection.instrument.id,
      windowEndEpochMs: oldestEpochMs,
      windowStartEpochMs: Math.max(
        boundedStart,
        Math.min(targetContextStart, oldestEpochMs - MINUTE),
      ),
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
    dispose() {
      provider.dispose?.();
      projectedHistoryProvider.dispose?.();
    },
    entryAdvanceMs: MINUTE,
    ids: FOUNDATION_IDS,
    planEligibleMinutes,
    provider,
    projectedHistoryProvider,
    request,
    requestBefore,
    requestProjectedHistoryBefore,
    requestForTimeLocation,
    requestThrough,
    requestWindow: rawRequest,
    requiresProjectedReplacementHistory,
    supportsProjectedHistory,
  });
}

export function supportsFoundationWorkspace(record) {
  const instrumentIds = record?.configuration?.instrumentIds;
  const supported = new Set(Object.values(FOUNDATION_IDS.instruments));
  return Array.isArray(instrumentIds) && instrumentIds.length > 0
    && instrumentIds.includes(FOUNDATION_IDS.instrument)
    && instrumentIds.every((id) => supported.has(id));
}
