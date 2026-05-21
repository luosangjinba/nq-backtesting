// Price helpers for instrument tick alignment.

import { INSTRUMENT_CONFIG } from './config.js';

export function getInstrumentTickSize(instrument = 'NQ') {
  return INSTRUMENT_CONFIG[instrument]?.tickSize ?? 0.25;
}

export function roundToTick(price, tickSize = getInstrumentTickSize(), mode = 'nearest') {
  const numericPrice = Number(price);
  const numericTick = Number(tickSize);
  if (!Number.isFinite(numericPrice) || !Number.isFinite(numericTick) || numericTick <= 0) {
    return numericPrice;
  }

  const scaled = numericPrice / numericTick;
  if (mode === 'floor') return Math.floor(scaled) * numericTick;
  if (mode === 'ceil') return Math.ceil(scaled) * numericTick;
  return Math.round(scaled) * numericTick;
}

export function buildCePrice(topPrice, bottomPrice, instrument = 'NQ', rounding = 'nearest') {
  const top = Number(topPrice);
  const bottom = Number(bottomPrice);
  if (!Number.isFinite(top) || !Number.isFinite(bottom)) return null;

  const tickSize = getInstrumentTickSize(instrument);
  const raw = (top + bottom) / 2;
  const price = roundToTick(raw, tickSize, rounding);

  return {
    raw,
    price,
    tickSize,
    rounding,
  };
}
