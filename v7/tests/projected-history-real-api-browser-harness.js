import assert from 'node:assert/strict';
import { createRawBarRequest } from '../src/bar-data-contract/public.js';
import { createProjectedHistoryRequest } from '../src/projected-history-contract/public.js';
import {
  createFoundationCapabilities,
  FOUNDATION_IDS,
} from '../src/replay-workspace-composition/public.js';
import {
  createV4BarsAdapter,
  createV4ProjectedHistoryProvider,
  V4_BARS_DATASET_REVISION,
  V4_BARS_PROVIDER_ID,
  V4_PROJECTED_HISTORY_PROVIDER_ID,
} from '../src/v4-bars-provider-adapter/public.js';

const capabilities = createFoundationCapabilities();
const rawProvider = createV4BarsAdapter();
const projectedProvider = createV4ProjectedHistoryProvider();
const durationMs = 240 * 60_000;
const startEpochMs = Date.parse('2025-10-20T00:00:00Z');
const windowEndEpochMs = Date.parse('2025-11-20T04:00:00Z');

for (const sessionHoursMode of ['eth', 'rth']) {
  const selection = capabilities.catalog.get({
    instrumentId: FOUNDATION_IDS.instrument,
    sessionHoursMode,
    timeframeId: 'timeframe.display-4-hour',
  });
  const raw = (await rawProvider.requestRawBars(createRawBarRequest({
    datasetRevision: V4_BARS_DATASET_REVISION,
    instrumentId: FOUNDATION_IDS.instrument,
    providerId: V4_BARS_PROVIDER_ID,
    schemaVersion: 1,
    sourceResolutionId: FOUNDATION_IDS.resolution,
    windowEndEpochMs,
    windowStartEpochMs: startEpochMs,
  }))).batch;
  const eligible = raw.bars.filter((bar) => selection.sessionHoursPolicy.isEligible(bar, {
    calendar: selection.calendar,
    instrument: selection.instrument,
    sessionHoursMode,
  }));
  const expected = selection.aggregationPolicy.project(eligible, {
    aggregationPolicyRevision: selection.aggregationPolicy.revision,
    calendar: selection.calendar,
    displayTimeframe: selection.displayTimeframe,
    instrument: selection.instrument,
    sessionHoursMode,
    sourceResolutionId: FOUNDATION_IDS.resolution,
  }).map((bar) => Object.freeze({ ...bar, labelDate: null }));
  const actual = await projectedProvider.requestProjectedHistory(createProjectedHistoryRequest({
    aggregationPolicyRevision: selection.aggregationPolicy.revision,
    alignmentKind: 'fixed-duration',
    alignmentPolicyId: null,
    calendarRevision: selection.calendar.revision,
    datasetRevision: V4_BARS_DATASET_REVISION,
    displayTimeframeId: selection.displayTimeframe.id,
    durationMs,
    instrumentId: FOUNDATION_IDS.instrument,
    providerId: V4_PROJECTED_HISTORY_PROVIDER_ID,
    schemaVersion: 1,
    sessionHoursMode,
    windowEndEpochMs,
    windowStartEpochMs: startEpochMs,
  }));
  assert.deepEqual(actual.bars, expected,
    `${sessionHoursMode.toUpperCase()} projected history must equal source-1m aggregation across DST`);
}

for (const sessionHoursMode of ['eth', 'rth']) {
  const selections = ['timeframe.display-1-day', 'timeframe.display-1-week', 'timeframe.display-1-month']
    .map((timeframeId) => capabilities.catalog.get({
      instrumentId: FOUNDATION_IDS.instrument,
      sessionHoursMode,
      timeframeId,
    }));
  const calendarEndEpochMs = Date.parse('2025-11-10T17:00:00Z');
  for (const selection of selections) {
    const calendarStartEpochMs = capabilities.historyPlanning(selection)
      .alignStartEpochMs(Date.parse('2025-10-15T16:00:00Z'));
    const raw = (await rawProvider.requestRawBars(createRawBarRequest({
      datasetRevision: V4_BARS_DATASET_REVISION,
      instrumentId: FOUNDATION_IDS.instrument,
      providerId: V4_BARS_PROVIDER_ID,
      schemaVersion: 1,
      sourceResolutionId: FOUNDATION_IDS.resolution,
      windowEndEpochMs: calendarEndEpochMs,
      windowStartEpochMs: calendarStartEpochMs,
    }))).batch;
    const eligible = raw.bars.filter((bar) => selection.sessionHoursPolicy.isEligible(bar, {
      calendar: selection.calendar,
      instrument: selection.instrument,
      sessionHoursMode,
    }));
    const expected = selection.aggregationPolicy.project(eligible, {
      aggregationPolicyRevision: selection.aggregationPolicy.revision,
      calendar: selection.calendar,
      displayTimeframe: selection.displayTimeframe,
      instrument: selection.instrument,
      sessionHoursMode,
      sourceResolutionId: FOUNDATION_IDS.resolution,
    });
    const actual = await projectedProvider.requestProjectedHistory(createProjectedHistoryRequest({
      aggregationPolicyRevision: selection.aggregationPolicy.revision,
      alignmentKind: 'calendar',
      alignmentPolicyId: selection.displayTimeframe.alignment.policyId,
      calendarRevision: selection.calendar.revision,
      datasetRevision: V4_BARS_DATASET_REVISION,
      displayTimeframeId: selection.displayTimeframe.id,
      durationMs: null,
      instrumentId: FOUNDATION_IDS.instrument,
      providerId: V4_PROJECTED_HISTORY_PROVIDER_ID,
      schemaVersion: 1,
      sessionHoursMode,
      windowEndEpochMs: calendarEndEpochMs,
      windowStartEpochMs: calendarStartEpochMs,
    }));
    assert.deepEqual(actual.bars, expected,
      `${sessionHoursMode.toUpperCase()} ${selection.displayTimeframe.display.shortLabel}`
      + ' projected history must equal source-1m calendar aggregation across DST');
  }
}

console.log('v7 projected history real API browser harness passed (4h/calendar ETH/RTH across DST)');
