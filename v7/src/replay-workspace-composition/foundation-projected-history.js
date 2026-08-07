import { createProjectedHistoryRequest } from '../projected-history-contract/public.js';
import {
  MARKET_DATA_PROJECTED_HISTORY_PROVIDER_ID,
} from '../market-data-provider-adapter/public.js';
import { planSingleHistoryWindow } from './history-window-plan.js';

const MINUTE = 60_000;
const MAXIMUM_PROJECTED_HISTORY_WINDOW_MS = 24 * 366 * 24 * 60 * MINUTE;
const PROJECTED_HISTORY_MINIMUM_DURATION_MS = 60 * MINUTE;

function supportsProjectedHistory(selection) {
  return selection?.displayTimeframe?.alignment?.kind === 'calendar'
    || (selection?.displayTimeframe?.alignment?.kind === 'fixed-duration'
      && selection.displayTimeframe.alignment.durationMs >= PROJECTED_HISTORY_MINIMUM_DURATION_MS);
}

export function createFoundationProjectedHistory({
  capabilities,
  entryHistoryEndEpochMs,
  isEligibleMinute,
  maximumRequestSourceBars,
  plannedEntryHistoryStart,
  readDatasetRevision,
  targetHistoryDisplayBars,
}) {
  function requiresReplacement(request, selection, displayBars) {
    if (!supportsProjectedHistory(selection)) return false;
    if (selection.displayTimeframe.alignment.kind === 'calendar') return true;
    const plannedStart = plannedEntryHistoryStart(selection, displayBars);
    const hardStart = Math.max(
      0,
      entryHistoryEndEpochMs - (maximumRequestSourceBars * MINUTE),
    );
    return plannedStart <= hardStart || request.windowStartEpochMs > plannedStart;
  }

  function requestBefore(
    oldestEpochMs,
    selection = capabilities.defaultSelection,
    targetDisplayBars = targetHistoryDisplayBars,
  ) {
    if (!supportsProjectedHistory(selection)) {
      throw new TypeError('Projected History requires a registered higher timeframe.');
    }
    const windowEndEpochMs = Math.max(MINUTE, oldestEpochMs);
    const alignment = selection.displayTimeframe.alignment;
    const planning = capabilities.historyPlanning(selection);
    const displayBars = Math.ceil(targetDisplayBars ?? targetHistoryDisplayBars);
    const datasetRevision = readDatasetRevision();
    if (datasetRevision === null) {
      throw new TypeError('Projected History dataset revision must be resolved before planning data.');
    }
    const windowStartEpochMs = alignment.kind === 'calendar'
      ? planning.alignStartEpochMs(Math.max(
        0,
        windowEndEpochMs - Math.min(
          MAXIMUM_PROJECTED_HISTORY_WINDOW_MS,
          planning.durationMs * displayBars,
        ),
      ))
      : planSingleHistoryWindow({
        durationMs: planning.durationMs,
        isEligibleMinute: (epochMs) => isEligibleMinute(epochMs, selection),
        maximumWindowMs: MAXIMUM_PROJECTED_HISTORY_WINDOW_MS,
        targetDisplayBars: displayBars,
        windowEndEpochMs,
      });
    return createProjectedHistoryRequest({
      aggregationPolicyRevision: selection.aggregationPolicy.revision,
      alignmentKind: alignment.kind,
      alignmentPolicyId: alignment.kind === 'calendar' ? alignment.policyId : null,
      calendarRevision: selection.calendar.revision,
      datasetRevision,
      displayTimeframeId: selection.displayTimeframe.id,
      durationMs: alignment.kind === 'fixed-duration' ? alignment.durationMs : null,
      instrumentId: selection.instrument.id,
      providerId: MARKET_DATA_PROJECTED_HISTORY_PROVIDER_ID,
      schemaVersion: 1,
      sessionHoursMode: selection.sessionHoursMode,
      windowEndEpochMs,
      windowStartEpochMs,
    });
  }

  return Object.freeze({
    requestBefore,
    requiresReplacement,
    supportsProjectedHistory: (selection = capabilities.defaultSelection) => (
      supportsProjectedHistory(selection)
    ),
  });
}
