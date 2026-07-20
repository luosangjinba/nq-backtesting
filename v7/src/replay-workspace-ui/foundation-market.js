import { createRawBarBatch, createRawBarRequest } from '../bar-data-contract/public.js';
import {
  defineInstrument,
  defineTimeframe,
  defineTradingCalendar,
} from '../capability-contract/public.js';

const IDS = Object.freeze({
  aggregation: 'projection.identity',
  calendar: 'calendar.cme-equity-index',
  instrument: 'instrument.cme.nq',
  provider: 'provider.local-foundation',
  resolution: 'resolution.fixed-1-minute',
  sessionHours: 'session-hours.cme-eth',
  timeframe: 'timeframe.display-1-minute',
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

function generateBars(request) {
  const bars = [];
  let index = 0;
  for (let epoch = request.windowStartEpochMs; epoch < request.windowEndEpochMs; epoch += 60_000) {
    const drift = index * 0.38;
    const wave = Math.sin(index / 6) * 5.5;
    const open = 20_000 + drift + wave;
    const close = open + Math.sin(index * 1.7) * 2.8;
    bars.push({
      close,
      high: Math.max(open, close) + 2.2,
      low: Math.min(open, close) - 2.1,
      open,
      startEpochMs: epoch,
      volume: 80 + ((index * 17) % 90),
    });
    index += 1;
  }
  return bars;
}

/** Concrete R4.5 one-pane capability fixture, isolated outside all core owners. */
export function createFoundationMarket(record) {
  const range = record.configuration.historicalRange;
  const requestEnd = Math.min(range.endEpochMs, range.startEpochMs + (360 * 60_000));
  const request = createRawBarRequest({
    datasetRevision: 'foundation-r1',
    instrumentId: IDS.instrument,
    providerId: IDS.provider,
    schemaVersion: 1,
    sourceResolutionId: IDS.resolution,
    windowEndEpochMs: requestEnd,
    windowStartEpochMs: range.startEpochMs,
  });
  const instrument = defineInstrument({
    ...base('instrument', 'InstrumentDefinition', IDS.instrument, 'NQ'),
    calendarId: IDS.calendar,
    exchangeTimeZone: 'America/New_York',
    priceIncrement: '0.25',
    providerIds: [IDS.provider],
    quantityIncrement: '1',
    symbol: 'NQ',
  });
  const calendar = defineTradingCalendar({
    ...base('calendar', 'TradingCalendar', IDS.calendar, 'CME Equity Index'),
    alignmentPolicyIds: ['alignment.fixed-duration'],
    revision: 'foundation-2026-r1',
    sessionHoursPolicyIds: [IDS.sessionHours],
    timeZone: 'America/New_York',
  });
  const displayTimeframe = defineTimeframe({
    ...base('timeframe', 'TimeframeDefinition', IDS.timeframe, '1m'),
    aggregationPolicyId: IDS.aggregation,
    alignment: { durationMs: 60_000, kind: 'fixed-duration' },
    sourceResolutionIds: [IDS.resolution],
  });
  const policies = Object.freeze({
    aggregationPolicy: Object.freeze({
      deterministic: true,
      id: IDS.aggregation,
      project: (bars) => bars,
      revision: 'identity-r1',
    }),
    sessionHoursPolicy: Object.freeze({
      deterministic: true,
      id: IDS.sessionHours,
      isEligible: () => true,
      revision: 'eth-foundation-r1',
    }),
  });
  const provider = Object.freeze({
    requestRawBars: (rawRequest) => createRawBarBatch({
      bars: generateBars(rawRequest),
      request: rawRequest,
      schemaVersion: 1,
    }),
  });
  return Object.freeze({ calendar, displayTimeframe, ids: IDS, instrument, policies, provider, request });
}

export function supportsFoundationWorkspace(record) {
  return record?.configuration?.instrumentIds?.includes(IDS.instrument) === true;
}
