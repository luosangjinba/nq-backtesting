// Objective metrics for manually confirmed segment/PDA reaction evidence.

import { timeframeToString } from '../config.js';
import { getPdaType } from '../pda/pda-types.js';

export const EVIDENCE_TYPES = {
  FVG_RESPECT: 'fvg-respect',
  LIQUIDITY_SWEEP: 'liquidity-sweep',
};

export const FVG_ENTRY_SIDES = new Set(['from-above', 'from-below']);
export const LIQUIDITY_SIDES = new Set(['high', 'low']);

function now() {
  return Date.now();
}

function makeEvidenceId(type = 'evidence') {
  return `${type}_${now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getTimestamp(value) {
  if (value === undefined || value === null || value === '') return null;
  if (Number.isFinite(Number(value))) return Number(value);

  const normalized = String(value).trim().replace(' ', 'T');
  const parsed = Date.parse(`${normalized.endsWith('Z') ? normalized : `${normalized}Z`}`);
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
}

function getBarTimestamp(bar) {
  return getTimestamp(bar?.timestamp ?? bar?.time);
}

function getBodyHigh(bar) {
  const open = asNumber(bar?.open);
  const close = asNumber(bar?.close);
  return open === null || close === null ? null : Math.max(open, close);
}

function getBodyLow(bar) {
  const open = asNumber(bar?.open);
  const close = asNumber(bar?.close);
  return open === null || close === null ? null : Math.min(open, close);
}

function rangePercent(numerator, denominator) {
  if (!Number.isFinite(Number(numerator)) || !Number.isFinite(Number(denominator)) || Number(denominator) === 0) {
    return null;
  }
  return (Number(numerator) / Math.abs(Number(denominator))) * 100;
}

function getRangeBounds(annotation) {
  const top = asNumber(annotation?.topPrice ?? annotation?.priceHigh);
  const bottom = asNumber(annotation?.bottomPrice ?? annotation?.priceLow);
  if (top === null || bottom === null) return null;
  return {
    top: Math.max(top, bottom),
    bottom: Math.min(top, bottom),
  };
}

function getLiquidityPrice(annotation) {
  return asNumber(annotation?.referencePrice ?? annotation?.price);
}

export function parseEvidenceTimestamp(value) {
  return getTimestamp(value);
}

export function getActorBars(bars = [], actor = {}) {
  const first = getTimestamp(actor.firstBarTimestamp);
  const last = getTimestamp(actor.lastBarTimestamp);
  if (first === null || last === null || !Array.isArray(bars)) return [];

  const start = Math.min(first, last);
  const end = Math.max(first, last);
  return bars
    .filter((bar) => {
      const timestamp = getBarTimestamp(bar);
      return timestamp !== null && timestamp >= start && timestamp <= end;
    })
    .sort((a, b) => getBarTimestamp(a) - getBarTimestamp(b));
}

export function getActorGroupStats(actorBars = []) {
  const highs = actorBars.map((bar) => asNumber(bar.high)).filter((value) => value !== null);
  const lows = actorBars.map((bar) => asNumber(bar.low)).filter((value) => value !== null);
  const bodyHighs = actorBars.map(getBodyHigh).filter((value) => value !== null);
  const bodyLows = actorBars.map(getBodyLow).filter((value) => value !== null);

  if (!highs.length || !lows.length || !bodyHighs.length || !bodyLows.length) {
    return { valid: false, reason: 'missing-actor-bars' };
  }

  return {
    valid: true,
    barCount: actorBars.length,
    highestWick: Math.max(...highs),
    lowestWick: Math.min(...lows),
    highestBody: Math.max(...bodyHighs),
    lowestBody: Math.min(...bodyLows),
  };
}

export function inferLiquiditySide(annotation = {}) {
  const pdaType = getPdaType(annotation.type);
  if (pdaType?.priceField === 'high' || annotation.type === 'eqh') return 'high';
  if (pdaType?.priceField === 'low' || annotation.type === 'eql') return 'low';
  return null;
}

export function createReactionEvidence({
  type,
  pdaId,
  timeframe,
  firstBarTimestamp,
  lastBarTimestamp,
  terminalBarTimestamp,
  params = {},
  note = '',
} = {}) {
  const createdAt = now();
  return normalizeReactionEvidence({
    id: makeEvidenceId(type),
    type,
    pdaId,
    actor: {
      timeframe: timeframe || '1H',
      firstBarTimestamp,
      lastBarTimestamp,
      terminalBarTimestamp,
    },
    params,
    note,
    createdAt,
    updatedAt: createdAt,
  });
}

export function normalizeReactionEvidence(evidence = {}) {
  const type = Object.values(EVIDENCE_TYPES).includes(evidence.type)
    ? evidence.type
    : EVIDENCE_TYPES.FVG_RESPECT;
  const actor = evidence.actor || {};
  const params = evidence.params || {};

  return {
    id: evidence.id || makeEvidenceId(type),
    type,
    pdaId: evidence.pdaId || '',
    actor: {
      timeframe: actor.timeframe || '1H',
      firstBarTimestamp: getTimestamp(actor.firstBarTimestamp),
      lastBarTimestamp: getTimestamp(actor.lastBarTimestamp),
      terminalBarTimestamp: getTimestamp(actor.terminalBarTimestamp),
    },
    params: {
      ...params,
      ...(type === EVIDENCE_TYPES.FVG_RESPECT
        ? { entrySide: FVG_ENTRY_SIDES.has(params.entrySide) ? params.entrySide : 'from-above' }
        : {}),
      ...(type === EVIDENCE_TYPES.LIQUIDITY_SWEEP && LIQUIDITY_SIDES.has(params.liquiditySide)
        ? { liquiditySide: params.liquiditySide }
        : {}),
    },
    metrics: evidence.metrics || null,
    note: evidence.note || '',
    createdAt: Number.isFinite(Number(evidence.createdAt)) ? Number(evidence.createdAt) : now(),
    updatedAt: Number.isFinite(Number(evidence.updatedAt)) ? Number(evidence.updatedAt) : now(),
  };
}

export function computeFvgRespectMetrics(evidence, annotation, bars = []) {
  const normalized = normalizeReactionEvidence(evidence);
  const bounds = getRangeBounds(annotation);
  if (!bounds) return { valid: false, reason: 'missing-fvg-bounds' };

  const actorBars = getActorBars(bars, normalized.actor);
  const stats = getActorGroupStats(actorBars);
  if (!stats.valid) return stats;

  const fvgRangePoints = bounds.top - bounds.bottom;
  if (fvgRangePoints <= 0) return { valid: false, reason: 'invalid-fvg-range' };

  const entrySide = normalized.params.entrySide || 'from-above';
  const wickExtreme = entrySide === 'from-below' ? stats.highestWick : stats.lowestWick;
  const bodyExtreme = entrySide === 'from-below' ? stats.highestBody : stats.lowestBody;
  const wickEntryPoints =
    entrySide === 'from-below' ? wickExtreme - bounds.bottom : bounds.top - wickExtreme;
  const bodyEntryPoints =
    entrySide === 'from-below' ? bodyExtreme - bounds.bottom : bounds.top - bodyExtreme;
  const wickEntryPercentOfFvg = rangePercent(wickEntryPoints, fvgRangePoints);
  const bodyEntryPercentOfFvg = rangePercent(bodyEntryPoints, fvgRangePoints);

  return {
    valid: true,
    type: EVIDENCE_TYPES.FVG_RESPECT,
    entrySide,
    actorBarCount: stats.barCount,
    fvgTop: bounds.top,
    fvgBottom: bounds.bottom,
    fvgRangePoints,
    wickExtreme,
    bodyExtreme,
    wickEntryPercentOfFvg,
    bodyEntryPercentOfFvg,
    bodyExceededFvg: Number(bodyEntryPercentOfFvg) > 100,
  };
}

export function computeLiquiditySweepMetrics(evidence, annotation, bars = []) {
  const normalized = normalizeReactionEvidence(evidence);
  const actorBars = getActorBars(bars, normalized.actor);
  const stats = getActorGroupStats(actorBars);
  if (!stats.valid) return stats;

  const liquidityPrice = getLiquidityPrice(annotation);
  if (liquidityPrice === null) return { valid: false, reason: 'missing-liquidity-price' };

  const liquiditySide = normalized.params.liquiditySide || inferLiquiditySide(annotation);
  if (!LIQUIDITY_SIDES.has(liquiditySide)) return { valid: false, reason: 'unknown-liquidity-side' };

  const moveRangePoints = stats.highestWick - stats.lowestWick;
  if (moveRangePoints <= 0) return { valid: false, reason: 'invalid-move-range' };

  const wickExtreme = liquiditySide === 'high' ? stats.highestWick : stats.lowestWick;
  const bodyExtreme = liquiditySide === 'high' ? stats.highestBody : stats.lowestBody;
  const wickSweepDistance =
    liquiditySide === 'high' ? wickExtreme - liquidityPrice : liquidityPrice - wickExtreme;
  const bodySweepDistance =
    liquiditySide === 'high' ? bodyExtreme - liquidityPrice : liquidityPrice - bodyExtreme;

  return {
    valid: true,
    type: EVIDENCE_TYPES.LIQUIDITY_SWEEP,
    liquiditySide,
    actorBarCount: stats.barCount,
    liquidityPrice,
    moveRangePoints,
    wickExtreme,
    bodyExtreme,
    wickSwept: wickSweepDistance > 0,
    bodySwept: bodySweepDistance > 0,
    wickSweepPercentOfMove: rangePercent(wickSweepDistance, moveRangePoints),
    bodySweepPercentOfMove: rangePercent(bodySweepDistance, moveRangePoints),
  };
}

export function computeReactionEvidenceMetrics(evidence, annotation, bars = []) {
  const normalized = normalizeReactionEvidence(evidence);
  if (normalized.type === EVIDENCE_TYPES.FVG_RESPECT) {
    return computeFvgRespectMetrics(normalized, annotation, bars);
  }
  if (normalized.type === EVIDENCE_TYPES.LIQUIDITY_SWEEP) {
    return computeLiquiditySweepMetrics(normalized, annotation, bars);
  }
  return { valid: false, reason: 'unsupported-evidence-type' };
}

export function buildDefaultActorFromSegment(segment, timeframe) {
  const terminalBarTimestamp = getTimestamp(segment?.end?.timestamp ?? segment?.end?.time);
  return {
    timeframe: timeframe || segment?.timeframe || timeframeToString(60),
    firstBarTimestamp: terminalBarTimestamp,
    lastBarTimestamp: terminalBarTimestamp,
    terminalBarTimestamp,
  };
}
