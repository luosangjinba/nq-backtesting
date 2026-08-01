import { createRawBarRequest } from '../bar-data-contract/public.js';
import {
  createV4BarsProvider,
  createV4ProjectedHistoryProvider,
  V4_BARS_DATASET_REVISION,
} from '../v4-bars-provider-adapter/public.js';
import { createFoundationCapabilities, FOUNDATION_IDS } from './foundation-capabilities.js';
import {
  requireTargetDisplayBars,
  sourceBarsForDisplay,
  TARGET_HISTORY_DISPLAY_BARS,
} from './foundation-history-budget.js';
import { planSingleHistoryWindow } from './history-window-plan.js';
import { createFoundationProjectedHistory } from './foundation-projected-history.js';
const MINUTE = 60_000;
const ENTRY_PREFIX_BARS = 120;
const FORWARD_BUFFER_SOURCE_BARS = 500;
const FORWARD_BUFFER_REPLAY_STEPS = 64;
const MINIMUM_HISTORY_SOURCE_BARS = 240;
const MAXIMUM_REQUEST_SOURCE_BARS = 35 * 24 * 60;
const MAXIMUM_SINGLE_HISTORY_DAYS = 210;
const MAXIMUM_SINGLE_HISTORY_WINDOW_MS = MAXIMUM_SINGLE_HISTORY_DAYS * 24 * 60 * MINUTE;

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
  function historySourceBars(selection, displayBars = TARGET_HISTORY_DISPLAY_BARS) {
    return sourceBarsForDisplay({
      displayBars,
      durationMs: capabilities.historyPlanning(selection).durationMs,
      maximumSourceBars: MAXIMUM_REQUEST_SOURCE_BARS,
      minimumSourceBars: MINIMUM_HISTORY_SOURCE_BARS,
      sourceDurationMs: MINUTE,
    });
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
  function latestEligibleMinute(epochMs, selection) {
    const minimumEpochMs = Math.max(0, epochMs - (14 * 24 * 60 * MINUTE));
    for (let candidate = epochMs; candidate >= minimumEpochMs; candidate -= MINUTE) {
      if (isEligibleMinute(candidate, selection)) return candidate;
    }
    throw new TypeError('Calendar history planning found no eligible source minute.');
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
    if (selection.displayTimeframe.alignment.kind === 'calendar') {
      const ethSelection = capabilities.catalog.get({
        instrumentId: selection.instrument.id,
        sessionHoursMode: 'eth',
        timeframeId: selection.displayTimeframe.id,
      });
      return Math.min(
        capabilities.historyPlanning(ethSelection).alignStartEpochMs(
          latestEligibleMinute(entryHistoryEndEpochMs - MINUTE, ethSelection),
        ),
        capabilities.historyPlanning(planningSelection).alignStartEpochMs(
          latestEligibleMinute(entryHistoryEndEpochMs - MINUTE, planningSelection),
        ),
      );
    }
    return planSingleHistoryWindow({
      durationMs: capabilities.historyPlanning(planningSelection).durationMs,
      isEligibleMinute: (epochMs) => isEligibleMinute(epochMs, planningSelection),
      maximumWindowMs: MAXIMUM_REQUEST_SOURCE_BARS * MINUTE,
      targetDisplayBars: requireTargetDisplayBars(displayBars),
      windowEndEpochMs: entryHistoryEndEpochMs,
    });
  }
  function requestThrough(
    exclusiveEndEpochMs,
    selection = capabilities.defaultSelection,
    replacementDisplayBars = null,
    replayStepDurationMs = null,
  ) {
    const displayBars = requireTargetDisplayBars(
      replacementDisplayBars ?? TARGET_HISTORY_DISPLAY_BARS,
    );
    const requiredBars = Math.max(1, Math.ceil((exclusiveEndEpochMs - range.startEpochMs) / MINUTE));
    const replayBufferBars = replayStepDurationMs === null || replayStepDurationMs <= 60 * MINUTE
      ? 0
      : Math.ceil(replayStepDurationMs / MINUTE) * FORWARD_BUFFER_REPLAY_STEPS;
    const forwardBufferBars = Math.max(FORWARD_BUFFER_SOURCE_BARS, replayBufferBars);
    const bufferedBars = Math.ceil(requiredBars / forwardBufferBars) * forwardBufferBars;
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
    const planning = capabilities.historyPlanning(selection);
    return rawRequest({
      instrumentId: selection.instrument.id,
      windowEndEpochMs,
      windowStartEpochMs: planSingleHistoryWindow({
        durationMs: planning.durationMs,
        isEligibleMinute: (epochMs) => isEligibleMinute(epochMs, selection),
        maximumWindowMs: MAXIMUM_SINGLE_HISTORY_WINDOW_MS,
        targetDisplayBars: Math.ceil(targetDisplayBars ?? TARGET_HISTORY_DISPLAY_BARS),
        windowEndEpochMs,
      }),
    });
  }
  const projectedHistory = createFoundationProjectedHistory({
    capabilities,
    entryHistoryEndEpochMs,
    isEligibleMinute,
    maximumRequestSourceBars: MAXIMUM_REQUEST_SOURCE_BARS,
    plannedEntryHistoryStart,
    targetHistoryDisplayBars: TARGET_HISTORY_DISPLAY_BARS,
  });
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
    requestProjectedHistoryBefore: projectedHistory.requestBefore,
    requestForTimeLocation,
    requestThrough,
    requestWindow: rawRequest,
    requiresProjectedReplacementHistory: projectedHistory.requiresReplacement,
    supportsProjectedHistory: projectedHistory.supportsProjectedHistory,
  });
}
