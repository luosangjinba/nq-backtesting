import {
  defineInstrument,
  defineTimeframe,
  defineTradingCalendar,
} from '../capability-contract/public.js';
import { createFixedDurationAggregationPolicy } from '../fixed-timeframe-domain/public.js';
import { createSessionHoursCalendar, createSessionHoursPolicy } from '../session-hours-domain/public.js';
import { createWorkspaceReplacementCatalog } from '../workspace-replacement-runtime/public.js';
import {
  createNewYorkWallEpochConverter,
  V4_BARS_PROVIDER_ID,
} from '../v4-bars-provider-adapter/public.js';

const MINUTE = 60_000;
export const FOUNDATION_IDS = Object.freeze({
  calendar: 'calendar.cme-equity-index',
  instrument: 'instrument.cme.nq',
  instruments: Object.freeze({
    es: 'instrument.cme.es',
    nq: 'instrument.cme.nq',
  }),
  provider: V4_BARS_PROVIDER_ID,
  resolution: 'resolution.fixed-1-minute',
  sessionHours: Object.freeze({
    eth: 'session-hours.cme-eth',
    rth: 'session-hours.cme-rth',
  }),
});

const INSTRUMENTS = Object.freeze({
  [FOUNDATION_IDS.instruments.nq]: Object.freeze({
    id: FOUNDATION_IDS.instruments.nq,
    label: 'NQ',
    priceIncrement: '0.25',
    symbol: 'NQ',
  }),
  [FOUNDATION_IDS.instruments.es]: Object.freeze({
    id: FOUNDATION_IDS.instruments.es,
    label: 'ES',
    priceIncrement: '0.25',
    symbol: 'ES',
  }),
});

const TIMEFRAMES = Object.freeze([
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

const TIMEFRAME_MENU_GROUPS = Object.freeze([
  Object.freeze({
    label: 'Minutes',
    items: Object.freeze(TIMEFRAMES.filter(({ durationMinutes }) => durationMinutes < 60)),
  }),
  Object.freeze({
    label: 'Hours',
    items: Object.freeze(TIMEFRAMES.filter(({ durationMinutes }) => durationMinutes >= 60)),
  }),
  Object.freeze({
    label: 'Calendar',
    items: Object.freeze([
      Object.freeze({ id: 'timeframe.display-1-day', label: '1D', menuLabel: '1 day', unavailable: true }),
      Object.freeze({ id: 'timeframe.display-1-week', label: '1W', menuLabel: '1 week', unavailable: true }),
      Object.freeze({ id: 'timeframe.display-1-month', label: '1M', menuLabel: '1 month', unavailable: true }),
    ]),
  }),
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
function createExchangeWallEpochConverter() {
  return createNewYorkWallEpochConverter();
}

function selectedInstrumentIds(value) {
  const requested = value ?? [FOUNDATION_IDS.instrument];
  if (!Array.isArray(requested) || requested.length === 0
    || requested.some((id) => !Object.hasOwn(INSTRUMENTS, id))) {
    throw new TypeError('Foundation instruments must be a non-empty supported Session asset set.');
  }
  return Object.freeze([...requested]);
}

/** Register the bounded Session-asset capability cross-product used by the visible foundation slice. */
export function createFoundationCapabilities(instrumentIds = undefined) {
  const exchangeWallEpoch = createExchangeWallEpochConverter();
  const acceptedInstrumentIds = selectedInstrumentIds(instrumentIds);
  const instruments = Object.freeze(acceptedInstrumentIds.map((id) => {
    const descriptor = INSTRUMENTS[id];
    return defineInstrument({
      ...base('instrument', 'InstrumentDefinition', descriptor.id, descriptor.label),
      calendarId: FOUNDATION_IDS.calendar,
      exchangeTimeZone: 'America/New_York',
      priceIncrement: descriptor.priceIncrement,
      providerIds: [FOUNDATION_IDS.provider],
      quantityIncrement: '1',
      symbol: descriptor.symbol,
    });
  }));
  const instrument = instruments[0];
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
    supportedInstrumentIds: instruments.map(({ id }) => id),
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
        { startEpochMs: exchangeWallEpoch(bar.startEpochMs) }, context,
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
  const entries = instruments.flatMap((entryInstrument) => definitions.flatMap((timeframe) => (
    ['eth', 'rth'].map((mode) => ({
      aggregationPolicy: createFixedDurationAggregationPolicy({
        durationMs: timeframe.durationMinutes * MINUTE,
        id: timeframe.aggregationPolicyId,
        offsetMs: 0,
        revision: `fixed-${timeframe.durationMinutes}m-${mode}-exchange-grid-r2`,
        schemaVersion: 1,
        sourceDurationMs: MINUTE,
      }),
      calendar,
      displayTimeframe: timeframe.definition,
      instrument: entryInstrument,
      paneId: 'pane-template',
      sessionHoursMode: mode,
      sessionHoursPolicy: sessionPolicies[mode],
    }))
  )));
  const defaultTarget = Object.freeze({
    instrumentId: instrument.id,
    sessionHoursMode: 'eth',
    timeframeId: definitions[0].id,
  });
  const catalog = createWorkspaceReplacementCatalog(entries);
  return Object.freeze({
    calendar,
    catalog,
    defaultSelection: catalog.get(defaultTarget),
    defaultTarget,
    instrument,
    instrumentOptions: Object.freeze(instruments.map(({ id, symbol }) => Object.freeze({ id, label: symbol }))),
    instruments,
    sessionHoursModes: Object.freeze(['eth', 'rth']),
    timeframes: Object.freeze(definitions.map(({ id, label }) => Object.freeze({ id, label }))),
    timeframeMenuGroups: TIMEFRAME_MENU_GROUPS,
  });
}
