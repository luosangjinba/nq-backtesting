import { defineTimeframe } from '../capability-contract/public.js';
import { createFixedDurationAggregationPolicy } from '../fixed-timeframe-domain/public.js';
import { createReplayStep } from '../replay-contract/public.js';

const MINUTE = 60_000;
const FIXED_GRID_OFFSET_MS = 0;
const ITEMS = Object.freeze([
  [1, 'timeframe.display-1-minute', '1m', '1 minute'],
  [2, 'timeframe.display-2-minute', '2m', '2 minutes'],
  [3, 'timeframe.display-3-minute', '3m', '3 minutes'],
  [4, 'timeframe.display-4-minute', '4m', '4 minutes'],
  [5, 'timeframe.display-5-minute', '5m', '5 minutes'],
  [10, 'timeframe.display-10-minute', '10m', '10 minutes'],
  [15, 'timeframe.display-15-minute', '15m', '15 minutes'],
  [30, 'timeframe.display-30-minute', '30m', '30 minutes'],
  [60, 'timeframe.display-1-hour', '1h', '1 hour'],
  [120, 'timeframe.display-2-hour', '2h', '2 hours'],
  [240, 'timeframe.display-4-hour', '4h', '4 hours'],
  [480, 'timeframe.display-8-hour', '8h', '8 hours'],
  [720, 'timeframe.display-12-hour', '12h', '12 hours'],
].map(([durationMinutes, id, label, menuLabel]) => Object.freeze({
  durationMinutes, id, label, menuLabel,
})));

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

function registration(item, resolutionId) {
  const durationMs = item.durationMinutes * MINUTE;
  const aggregationPolicyId = `projection.fixed-${item.durationMinutes}-minute`;
  const replayStepId = `replay-step.fixed-${item.durationMinutes}-minute`;
  return Object.freeze({
    aggregationPolicyId,
    definition: defineTimeframe({
      ...base(item),
      aggregationPolicyId,
      alignment: { durationMs, kind: 'fixed-duration' },
      sourceResolutionIds: [resolutionId],
    }),
    durationMs,
    historyPlanning: () => Object.freeze({
      alignStartEpochMs(epochMs) {
        if (!Number.isSafeInteger(epochMs) || epochMs < 0) {
          throw new TypeError('History alignment requires a non-negative epoch.');
        }
        return Math.floor(epochMs / durationMs) * durationMs;
      },
      durationMs,
    }),
    menuItem: item,
    replayStepOption: Object.freeze({
      id: replayStepId,
      label: item.label,
      step: createReplayStep({
        durationMs,
        id: replayStepId,
        offsetMs: FIXED_GRID_OFFSET_MS,
        sourceDurationMs: MINUTE,
      }),
    }),
  });
}

export const FOUNDATION_FIXED_TIMEFRAME_EXTENSION = Object.freeze({
  alignmentPolicyIds: Object.freeze(['alignment.fixed-duration']),
  apiVersion: 1,
  id: 'timeframe-extension.foundation-fixed',
  register({ calendar, instruments, resolutionId, sessionPolicies }) {
    const timeframes = Object.freeze(ITEMS.map((item) => registration(item, resolutionId)));
    return Object.freeze({
      entries: Object.freeze(instruments.flatMap((instrument) => timeframes.flatMap((timeframe) => (
        ['eth', 'rth'].map((mode) => Object.freeze({
          aggregationPolicy: createFixedDurationAggregationPolicy({
            durationMs: timeframe.durationMs,
            id: timeframe.aggregationPolicyId,
            offsetMs: FIXED_GRID_OFFSET_MS,
            revision: `fixed-${timeframe.menuItem.durationMinutes}m-${mode}-exchange-grid-r2`,
            schemaVersion: 1,
            sourceDurationMs: MINUTE,
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
        Object.freeze({ label: 'Minutes', items: Object.freeze(ITEMS.filter(({ durationMinutes }) => durationMinutes < 60)) }),
        Object.freeze({ label: 'Hours', items: Object.freeze(ITEMS.filter(({ durationMinutes }) => durationMinutes >= 60)) }),
      ]),
      registrations: Object.freeze(timeframes.map(({
        definition, historyPlanning, menuItem, replayStepOption,
      }) => Object.freeze({ definition, historyPlanning, menuItem, replayStepOption }))),
    });
  },
  schemaVersion: 1,
});
