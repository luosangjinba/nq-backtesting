export const DEFAULT_PRICE_DECIMALS = 2;

export function formatPrice(value, {
  decimals = DEFAULT_PRICE_DECIMALS,
  signed = false,
} = {}) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return '--';
  const text = normalized.toFixed(decimals);
  if (!signed || normalized === 0) return text;
  return normalized > 0 ? `+${text}` : text;
}

export function formatOhlc(bar, options = {}) {
  if (!bar) return '--';
  return [
    `O ${formatPrice(bar.open, options)}`,
    `H ${formatPrice(bar.high, options)}`,
    `L ${formatPrice(bar.low, options)}`,
    `C ${formatPrice(bar.close, options)}`,
  ].join(' ');
}

export function formatChange(value, options = {}) {
  return formatPrice(value, { ...options, signed: true });
}

export function formatCandleTitle(bar, {
  timeText = '--',
  priceOptions = {},
} = {}) {
  return `${timeText} ${formatOhlc(bar, priceOptions)}`;
}

export function formatInspectionReadout({
  timeText = '--',
  price,
  bar,
  priceOptions = {},
} = {}) {
  const parts = [timeText];
  if (price != null && Number.isFinite(Number(price))) {
    parts.push(`P ${formatPrice(price, priceOptions)}`);
  }
  if (bar) {
    parts.push(formatOhlc(bar, priceOptions));
  }
  return parts.filter(Boolean).join('  ');
}
