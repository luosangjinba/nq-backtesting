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
const PRICE_TICK = 0.25;

function alignPrice(value) {
  return Math.round(value / PRICE_TICK) * PRICE_TICK;
}

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
    const open = previousClose;
    const balancedMove = sample(0x51f15e) + sample(0x9e3779) + sample(0x243f6a) - 1.5;
    const regime = Math.sin(minute / 47) * 0.35;
    const close = alignPrice(open + regime + (balancedMove * 5.2));
    const wick = (salt, rareSalt) => {
      let steps = 1 + Math.floor((sample(salt) ** 5) * 7);
      if (sample(rareSalt) > 0.992) steps += 8 + Math.floor(sample(rareSalt ^ 0x5bd1e9) * 8);
      return steps * PRICE_TICK;
    };
    const upperWick = wick(0x7f4a7c, 0xa54ff5);
    const lowerWick = wick(0x6a09e6, 0x510e52);
    bars.push({
      close,
      high: alignPrice(Math.max(open, close) + upperWick),
      low: alignPrice(Math.min(open, close) - lowerWick),
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
      mode: 'eth',
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
