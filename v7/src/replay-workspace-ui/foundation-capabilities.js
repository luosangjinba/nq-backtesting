import {
  defineInstrument,
  defineTradingCalendar,
} from '../capability-contract/public.js';
import { createSessionHoursCalendar, createSessionHoursPolicy } from '../session-hours-domain/public.js';
import { createWorkspaceReplacementCatalog } from '../workspace-replacement-runtime/public.js';
import {
  createNewYorkWallEpochConverter,
  newYorkWallEpochToInstantMs,
  V4_BARS_PROVIDER_ID,
} from '../v4-bars-provider-adapter/public.js';
import {
  createFoundationTimeframeRegistry,
  FOUNDATION_CALENDAR_ALIGNMENT_POLICY_IDS,
} from './foundation-timeframe-registry.js';

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
    alignmentPolicyIds: [
      'alignment.fixed-duration',
      ...FOUNDATION_CALENDAR_ALIGNMENT_POLICY_IDS,
    ],
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
  const wallPolicies = Object.freeze(Object.fromEntries(['eth', 'rth'].map((mode) => {
    const wallPolicy = createSessionHoursPolicy({
      calendar: sessionCalendar, id: FOUNDATION_IDS.sessionHours[mode], mode,
    });
    return [mode, wallPolicy];
  })));
  const sessionPolicies = Object.freeze(Object.fromEntries(['eth', 'rth'].map((mode) => (
    [mode, Object.freeze({
      ...wallPolicies[mode],
      isEligible: (bar, context) => wallPolicies[mode].isEligible(
        { startEpochMs: exchangeWallEpoch(bar.startEpochMs) }, context,
      ),
      revision: `${wallPolicies[mode].revision}-instant-adapter-r1`,
    })]
  ))));
  const timeframeRegistry = createFoundationTimeframeRegistry({
    calendar,
    exchangeWallEpoch,
    instruments,
    resolutionId: FOUNDATION_IDS.resolution,
    sessionPolicies,
    toInstantEpochMs: newYorkWallEpochToInstantMs,
    wallPolicies,
  });
  const { definitions, entries, historyPlanning } = timeframeRegistry;
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
    historyPlanning,
    instrument,
    instrumentOptions: Object.freeze(instruments.map(({ id, priceIncrement, symbol }) => Object.freeze({
      id, label: symbol, priceIncrement,
    }))),
    instruments,
    replayStepOptions: timeframeRegistry.replayStepOptions,
    sessionHoursModes: Object.freeze(['eth', 'rth']),
    timeframes: timeframeRegistry.timeframes,
    timeframeMenuGroups: timeframeRegistry.timeframeMenuGroups,
  });
}
