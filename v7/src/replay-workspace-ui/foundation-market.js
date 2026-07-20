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
  let previousClose = 20_000;
  for (let epoch = request.windowStartEpochMs; epoch < request.windowEndEpochMs; epoch += 60_000) {
    const minute = Math.floor(epoch / 60_000);
    const sample = (salt) => {
      let value = Math.imul((minute ^ salt) >>> 0, 0x45d9f3b);
      value = Math.imul((value ^ (value >>> 16)) >>> 0, 0x45d9f3b);
      return ((value ^ (value >>> 16)) >>> 0) / 0x1_0000_0000;
    };
    const open = previousClose + ((sample(0x51f15e) - 0.5) * 1.6);
    const regime = Math.sin(minute / 47) * 0.45;
    const close = open + regime + ((sample(0x9e3779) - 0.5) * 7.4);
    const upperWick = 0.45 + (sample(0x7f4a7c) * 3.8);
    const lowerWick = 0.45 + (sample(0x6a09e6) * 3.8);
    bars.push({
      close,
      high: Math.max(open, close) + upperWick,
      low: Math.min(open, close) - lowerWick,
      open,
      startEpochMs: epoch,
      volume: 70 + Math.floor(sample(0xbb67ae) * 170),
    });
    previousClose = close;
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
