import { defineTimeframe } from '../capability-contract/public.js';
import {
  createCalendarAggregationPolicy,
  resolveCalendarPeriod,
} from '../calendar-timeframe-domain/public.js';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const ITEMS = Object.freeze([
  ['day', DAY, 'alignment.calendar-day', 'timeframe.display-1-day', '1D', '1 day'],
  ['week', 7 * DAY, 'alignment.calendar-week', 'timeframe.display-1-week', '1W', '1 week'],
  ['month', 31 * DAY, 'alignment.calendar-month', 'timeframe.display-1-month', '1M', '1 month'],
].map(([period, historyPlanningDurationMs, alignmentPolicyId, id, label, menuLabel]) => (
  Object.freeze({ alignmentPolicyId, historyPlanningDurationMs, id, label, menuLabel, period })
)));

function base(item) {
  return {
    apiVersion: 1,
    contract: 'TimeframeDefinition',
    display: { label: item.label, shortLabel: item.label },
    id: item.id,
    kind: 'timeframe',
    schemaVersion: 1,
    version: '1.0.0',
  };
}

function registration(item, resolutionId, exchangeWallEpoch, toInstantEpochMs) {
  const aggregationPolicyId = `projection.calendar-${item.period}`;
  return Object.freeze({
    aggregationPolicyId,
    definition: defineTimeframe({
      ...base(item),
      aggregationPolicyId,
      alignment: { kind: 'calendar', policyId: item.alignmentPolicyId },
      sourceResolutionIds: [resolutionId],
    }),
    historyPlanning(selection) {
      return Object.freeze({
        alignStartEpochMs(epochMs) {
          if (!Number.isSafeInteger(epochMs) || epochMs < 0) {
            throw new TypeError('History alignment requires a non-negative epoch.');
          }
          const alignment = resolveCalendarPeriod({
            period: item.period,
            rollsToNextTradingDay: selection.sessionHoursMode === 'eth',
            sessionStartMinute: selection.sessionHoursMode === 'eth' ? 1080 : 570,
            wallEpochMs: exchangeWallEpoch(epochMs),
          });
          return toInstantEpochMs(alignment.wallStartEpochMs);
        },
        durationMs: item.historyPlanningDurationMs,
      });
    },
    menuItem: item,
    replayStepOption: null,
  });
}

export const FOUNDATION_CALENDAR_TIMEFRAME_EXTENSION = Object.freeze({
  alignmentPolicyIds: Object.freeze(ITEMS.map(({ alignmentPolicyId }) => alignmentPolicyId)),
  apiVersion: 1,
  id: 'timeframe-extension.foundation-calendar',
  register({
    calendar, exchangeWallEpoch, instruments, resolutionId, sessionPolicies,
    toInstantEpochMs, wallPolicies,
  }) {
    const timeframes = Object.freeze(ITEMS.map((item) => (
      registration(item, resolutionId, exchangeWallEpoch, toInstantEpochMs)
    )));
    return Object.freeze({
      entries: Object.freeze(instruments.flatMap((instrument) => timeframes.flatMap((timeframe) => (
        ['eth', 'rth'].map((mode) => Object.freeze({
          aggregationPolicy: createCalendarAggregationPolicy({
            alignmentPolicyId: timeframe.menuItem.alignmentPolicyId,
            id: timeframe.aggregationPolicyId,
            isEligibleWallEpoch: (wallEpochMs) => wallPolicies[mode].isEligible(
              { startEpochMs: wallEpochMs }, { calendar, instrument, sessionHoursMode: mode },
            ),
            period: timeframe.menuItem.period,
            revision: `calendar-${timeframe.menuItem.period}-${mode}-exchange-session-r1`,
            rollsToNextTradingDay: mode === 'eth',
            schemaVersion: 1,
            sessionHoursMode: mode,
            sessionStartMinute: mode === 'eth' ? 1080 : 570,
            sourceDurationMs: MINUTE,
            toInstantEpochMs,
            toWallEpochMs: exchangeWallEpoch,
          }),
          calendar,
          displayTimeframe: timeframe.definition,
          instrument,
          paneId: 'pane-template',
          sessionHoursMode: mode,
          sessionHoursPolicy: sessionPolicies[mode],
        }))
      )))),
      menuGroups: Object.freeze([
        Object.freeze({ label: 'Calendar', items: ITEMS }),
      ]),
      registrations: Object.freeze(timeframes.map(({
        definition, historyPlanning, menuItem, replayStepOption,
      }) => Object.freeze({ definition, historyPlanning, menuItem, replayStepOption }))),
    });
  },
  schemaVersion: 1,
});
