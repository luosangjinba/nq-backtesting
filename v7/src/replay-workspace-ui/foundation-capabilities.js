import {
  defineInstrument,
  defineTimeframe,
  defineTradingCalendar,
} from '../capability-contract/public.js';
import { createFixedDurationAggregationPolicy } from '../fixed-timeframe-domain/public.js';
import { createSessionHoursCalendar, createSessionHoursPolicy } from '../session-hours-domain/public.js';
import { createWorkspaceReplacementCatalog } from '../workspace-replacement-runtime/public.js';

const MINUTE = 60_000;
export const FOUNDATION_IDS = Object.freeze({
  calendar: 'calendar.cme-equity-index',
  instrument: 'instrument.cme.nq',
  provider: 'provider.local-foundation',
  resolution: 'resolution.fixed-1-minute',
  sessionHours: Object.freeze({
    eth: 'session-hours.cme-eth',
    rth: 'session-hours.cme-rth',
  }),
});

const TIMEFRAMES = Object.freeze([
  Object.freeze({ durationMinutes: 1, id: 'timeframe.display-1-minute', label: '1m' }),
  Object.freeze({ durationMinutes: 5, id: 'timeframe.display-5-minute', label: '5m' }),
  Object.freeze({ durationMinutes: 15, id: 'timeframe.display-15-minute', label: '15m' }),
  Object.freeze({ durationMinutes: 60, id: 'timeframe.display-1-hour', label: '1h' }),
]);

function base(kind, contract, id, label) {
  return {
    apiVersion: 1,
    contract,
    display: { label, shortLabel: label },
    id,
    kind,
    schemaVersion: 1,
    version: '1.0.0',
  };
}

const closed = () => [];
const interval = (startMinute, endMinute) => [{ startMinute, endMinute }];
const exchangeClock = new Intl.DateTimeFormat('en-CA', {
  day: '2-digit', hour: '2-digit', hourCycle: 'h23', minute: '2-digit', month: '2-digit',
  second: '2-digit', timeZone: 'America/New_York', year: 'numeric',
});

function exchangeWallEpoch(epochMs) {
  const parts = Object.fromEntries(exchangeClock.formatToParts(epochMs)
    .filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, value]));
  return Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second),
  );
}

/** Register the bounded NQ capability cross-product used by the visible foundation slice. */
export function createFoundationCapabilities() {
  const instrument = defineInstrument({
    ...base('instrument', 'InstrumentDefinition', FOUNDATION_IDS.instrument, 'NQ'),
    calendarId: FOUNDATION_IDS.calendar,
    exchangeTimeZone: 'America/New_York',
    priceIncrement: '0.25',
    providerIds: [FOUNDATION_IDS.provider],
    quantityIncrement: '1',
    symbol: 'NQ',
  });
  const calendar = defineTradingCalendar({
    ...base('calendar', 'TradingCalendar', FOUNDATION_IDS.calendar, 'CME Equity Index'),
    alignmentPolicyIds: ['alignment.fixed-duration'],
    revision: 'foundation-2026-r1',
    sessionHoursPolicyIds: Object.values(FOUNDATION_IDS.sessionHours),
    timeZone: 'America/New_York',
  });
  const sessionCalendar = createSessionHoursCalendar({
    exceptions: [],
    revision: calendar.revision,
    schemaVersion: 1,
    supportedInstrumentIds: [instrument.id],
    wallClockEncoding: 'exchange-wall-clock-utc-like',
    weeklySchedule: {
      eth: [
        interval(1080, 1440),
        ...Array.from({ length: 4 }, () => [
          { startMinute: 0, endMinute: 1020 }, { startMinute: 1080, endMinute: 1440 },
        ]),
        interval(0, 1020), closed(),
      ],
      rth: [closed(), ...Array.from({ length: 5 }, () => interval(570, 975)), closed()],
    },
  });
  const sessionPolicies = Object.freeze(Object.fromEntries(['eth', 'rth'].map((mode) => {
    const wallPolicy = createSessionHoursPolicy({
      calendar: sessionCalendar, id: FOUNDATION_IDS.sessionHours[mode], mode,
    });
    return [mode, Object.freeze({
      ...wallPolicy,
      isEligible: (bar, context) => wallPolicy.isEligible(
        { ...bar, startEpochMs: exchangeWallEpoch(bar.startEpochMs) }, context,
      ),
      revision: `${wallPolicy.revision}-instant-adapter-r1`,
    })];
  })));
  const definitions = Object.freeze(TIMEFRAMES.map((item) => {
    const aggregationPolicyId = `projection.fixed-${item.durationMinutes}-minute`;
    return Object.freeze({
      ...item,
      definition: defineTimeframe({
        ...base('timeframe', 'TimeframeDefinition', item.id, item.label),
        aggregationPolicyId,
        alignment: { durationMs: item.durationMinutes * MINUTE, kind: 'fixed-duration' },
        sourceResolutionIds: [FOUNDATION_IDS.resolution],
      }),
      aggregationPolicyId,
    });
  }));
  const entries = definitions.flatMap((timeframe) => ['eth', 'rth'].map((mode) => ({
    aggregationPolicy: createFixedDurationAggregationPolicy({
      durationMs: timeframe.durationMinutes * MINUTE,
      id: timeframe.aggregationPolicyId,
      offsetMs: mode === 'rth' ? (570 % timeframe.durationMinutes) * MINUTE : 0,
      revision: `fixed-${timeframe.durationMinutes}m-${mode}-r1`,
      schemaVersion: 1,
      sourceDurationMs: MINUTE,
    }),
    calendar,
    displayTimeframe: timeframe.definition,
    instrument,
    paneId: 'pane-main',
    sessionHoursMode: mode,
    sessionHoursPolicy: sessionPolicies[mode],
  })));
  const defaultTarget = Object.freeze({
    instrumentId: instrument.id,
    sessionHoursMode: 'eth',
    timeframeId: definitions[0].id,
  });
  return Object.freeze({
    calendar,
    catalog: createWorkspaceReplacementCatalog(entries),
    defaultSelection: entries[0],
    defaultTarget,
    instrument,
    sessionHoursModes: Object.freeze(['eth', 'rth']),
    timeframes: Object.freeze(definitions.map(({ id, label }) => Object.freeze({ id, label }))),
  });
}
