import { defineTimeframe } from '../capability-contract/public.js';
import {
  createCalendarAggregationPolicy,
  resolveCalendarPeriod,
} from '../calendar-timeframe-domain/public.js';
import { createFixedDurationAggregationPolicy } from '../fixed-timeframe-domain/public.js';
import { createReplayStep } from '../replay-contract/public.js';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const FIXED_GRID_OFFSET_MS = 0;

const FIXED_TIMEFRAMES = Object.freeze([
  Object.freeze({ durationMinutes: 1, id: 'timeframe.display-1-minute', label: '1m', menuLabel: '1 minute' }),
  Object.freeze({ durationMinutes: 2, id: 'timeframe.display-2-minute', label: '2m', menuLabel: '2 minutes' }),
  Object.freeze({ durationMinutes: 3, id: 'timeframe.display-3-minute', label: '3m', menuLabel: '3 minutes' }),
  Object.freeze({ durationMinutes: 4, id: 'timeframe.display-4-minute', label: '4m', menuLabel: '4 minutes' }),
  Object.freeze({ durationMinutes: 5, id: 'timeframe.display-5-minute', label: '5m', menuLabel: '5 minutes' }),
  Object.freeze({ durationMinutes: 10, id: 'timeframe.display-10-minute', label: '10m', menuLabel: '10 minutes' }),
  Object.freeze({ durationMinutes: 15, id: 'timeframe.display-15-minute', label: '15m', menuLabel: '15 minutes' }),
  Object.freeze({ durationMinutes: 30, id: 'timeframe.display-30-minute', label: '30m', menuLabel: '30 minutes' }),
  Object.freeze({ durationMinutes: 60, id: 'timeframe.display-1-hour', label: '1h', menuLabel: '1 hour' }),
  Object.freeze({ durationMinutes: 120, id: 'timeframe.display-2-hour', label: '2h', menuLabel: '2 hours' }),
  Object.freeze({ durationMinutes: 240, id: 'timeframe.display-4-hour', label: '4h', menuLabel: '4 hours' }),
  Object.freeze({ durationMinutes: 480, id: 'timeframe.display-8-hour', label: '8h', menuLabel: '8 hours' }),
  Object.freeze({ durationMinutes: 720, id: 'timeframe.display-12-hour', label: '12h', menuLabel: '12 hours' }),
]);

const CALENDAR_TIMEFRAMES = Object.freeze([
  Object.freeze({
    alignmentPolicyId: 'alignment.calendar-day', historyPlanningDurationMs: DAY,
    id: 'timeframe.display-1-day', label: '1D', menuLabel: '1 day', period: 'day',
  }),
  Object.freeze({
    alignmentPolicyId: 'alignment.calendar-week', historyPlanningDurationMs: 7 * DAY,
    id: 'timeframe.display-1-week', label: '1W', menuLabel: '1 week', period: 'week',
  }),
  Object.freeze({
    alignmentPolicyId: 'alignment.calendar-month', historyPlanningDurationMs: 31 * DAY,
    id: 'timeframe.display-1-month', label: '1M', menuLabel: '1 month', period: 'month',
  }),
]);

const TIMEFRAMES = Object.freeze([...FIXED_TIMEFRAMES, ...CALENDAR_TIMEFRAMES]);

export const FOUNDATION_CALENDAR_ALIGNMENT_POLICY_IDS = Object.freeze(
  CALENDAR_TIMEFRAMES.map(({ alignmentPolicyId }) => alignmentPolicyId),
);

const TIMEFRAME_MENU_GROUPS = Object.freeze([
  Object.freeze({
    label: 'Minutes',
    items: Object.freeze(FIXED_TIMEFRAMES.filter(({ durationMinutes }) => durationMinutes < 60)),
  }),
  Object.freeze({
    label: 'Hours',
    items: Object.freeze(FIXED_TIMEFRAMES.filter(({ durationMinutes }) => durationMinutes >= 60)),
  }),
  Object.freeze({ label: 'Calendar', items: CALENDAR_TIMEFRAMES }),
]);

function timeframeBase(id, label) {
  return {
    apiVersion: 1,
    contract: 'TimeframeDefinition',
    display: { label, shortLabel: label },
    id,
    kind: 'timeframe',
    schemaVersion: 1,
    version: '1.0.0',
  };
}

/** Compose the concrete foundation timeframe registrations without owning Workspace state. */
export function createFoundationTimeframeRegistry({
  calendar,
  exchangeWallEpoch,
  instruments,
  resolutionId,
  sessionPolicies,
  toInstantEpochMs,
  wallPolicies,
}) {
  const definitions = Object.freeze(TIMEFRAMES.map((item) => {
    const calendarAligned = item.durationMinutes === undefined;
    const aggregationPolicyId = calendarAligned
      ? `projection.calendar-${item.period}`
      : `projection.fixed-${item.durationMinutes}-minute`;
    return Object.freeze({
      ...item,
      definition: defineTimeframe({
        ...timeframeBase(item.id, item.label),
        aggregationPolicyId,
        alignment: calendarAligned
          ? { kind: 'calendar', policyId: item.alignmentPolicyId }
          : { durationMs: item.durationMinutes * MINUTE, kind: 'fixed-duration' },
        sourceResolutionIds: [resolutionId],
      }),
      aggregationPolicyId,
      calendarAligned,
      historyPlanningDurationMs: item.historyPlanningDurationMs
        ?? item.durationMinutes * MINUTE,
    });
  }));
  function aggregationPolicy(timeframe, mode, instrument) {
    if (!timeframe.calendarAligned) {
      return createFixedDurationAggregationPolicy({
        durationMs: timeframe.durationMinutes * MINUTE,
        id: timeframe.aggregationPolicyId,
        offsetMs: FIXED_GRID_OFFSET_MS,
        revision: `fixed-${timeframe.durationMinutes}m-${mode}-exchange-grid-r2`,
        schemaVersion: 1,
        sourceDurationMs: MINUTE,
      });
    }
    return createCalendarAggregationPolicy({
      alignmentPolicyId: timeframe.alignmentPolicyId,
      id: timeframe.aggregationPolicyId,
      isEligibleWallEpoch: (wallEpochMs) => wallPolicies[mode].isEligible(
        { startEpochMs: wallEpochMs },
        { calendar, instrument, sessionHoursMode: mode },
      ),
      period: timeframe.period,
      revision: `calendar-${timeframe.period}-${mode}-exchange-session-r1`,
      rollsToNextTradingDay: mode === 'eth',
      schemaVersion: 1,
      sessionHoursMode: mode,
      sessionStartMinute: mode === 'eth' ? 1080 : 570,
      sourceDurationMs: MINUTE,
      toInstantEpochMs,
      toWallEpochMs: exchangeWallEpoch,
    });
  }
  const entries = instruments.flatMap((instrument) => definitions.flatMap((timeframe) => (
    ['eth', 'rth'].map((mode) => ({
      aggregationPolicy: aggregationPolicy(timeframe, mode, instrument),
      calendar,
      displayTimeframe: timeframe.definition,
      instrument,
      paneId: 'pane-template',
      sessionHoursMode: mode,
      sessionHoursPolicy: sessionPolicies[mode],
    }))
  )));
  const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
  function historyPlanning(selection) {
    const timeframe = definitionById.get(selection?.displayTimeframe?.id);
    if (!timeframe) throw new TypeError('History planning requires a registered timeframe.');
    return Object.freeze({
      alignStartEpochMs(epochMs) {
        if (!Number.isSafeInteger(epochMs) || epochMs < 0) {
          throw new TypeError('History alignment requires a non-negative epoch.');
        }
        if (!timeframe.calendarAligned) {
          return Math.floor(epochMs / timeframe.historyPlanningDurationMs)
            * timeframe.historyPlanningDurationMs;
        }
        const alignment = resolveCalendarPeriod({
          period: timeframe.period,
          rollsToNextTradingDay: selection.sessionHoursMode === 'eth',
          sessionStartMinute: selection.sessionHoursMode === 'eth' ? 1080 : 570,
          wallEpochMs: exchangeWallEpoch(epochMs),
        });
        return toInstantEpochMs(alignment.wallStartEpochMs);
      },
      durationMs: timeframe.historyPlanningDurationMs,
    });
  }
  const replayStepOptions = Object.freeze(FIXED_TIMEFRAMES.map(({ durationMinutes, label }) => Object.freeze({
    id: `replay-step.fixed-${durationMinutes}-minute`,
    label,
    step: createReplayStep({
      durationMs: durationMinutes * MINUTE,
      id: `replay-step.fixed-${durationMinutes}-minute`,
      offsetMs: FIXED_GRID_OFFSET_MS,
      sourceDurationMs: MINUTE,
    }),
  })));
  return Object.freeze({
    definitions,
    entries,
    historyPlanning,
    replayStepOptions,
    timeframeMenuGroups: TIMEFRAME_MENU_GROUPS,
    timeframes: Object.freeze(definitions.map(({ durationMinutes, id, label }) => Object.freeze({
      id,
      label,
      replayStepId: durationMinutes === undefined
        ? null : `replay-step.fixed-${durationMinutes}-minute`,
    }))),
  });
}
