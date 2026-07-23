import { failWorkstationSettings } from './settings-value.js';

const POSITIVE_DECIMAL_PATTERN = /^(?:0*\.\d*[1-9]\d*|0*[1-9]\d*(?:\.\d+)?)$/;

function requirePriceIncrement(value) {
  if (typeof value !== 'string' || !POSITIVE_DECIMAL_PATTERN.test(value)) {
    failWorkstationSettings(
      'WORKSTATION_SETTINGS_PRICE_INCREMENT_INVALID',
      'Price presentation requires a positive decimal-string increment.',
    );
  }
  return value;
}

export function decimalPlacesForIncrement(priceIncrement) {
  const value = requirePriceIncrement(priceIncrement);
  const fraction = value.split('.')[1] ?? '';
  return fraction.replace(/0+$/, '').length;
}

export function resolvePricePrecision(pricePrecision, priceIncrement) {
  if (pricePrecision === 'auto') return decimalPlacesForIncrement(priceIncrement);
  if (!Number.isSafeInteger(pricePrecision) || pricePrecision < 0 || pricePrecision > 15) {
    failWorkstationSettings(
      'WORKSTATION_SETTINGS_PRICE_PRECISION_INVALID',
      'Price precision must be auto or an integer from 0 through 15.',
    );
  }
  requirePriceIncrement(priceIncrement);
  return pricePrecision;
}

export function createPricePresentation({ priceIncrement, pricePrecision }) {
  const increment = requirePriceIncrement(priceIncrement);
  const precision = resolvePricePrecision(pricePrecision, increment);
  const minMove = Number(increment);
  const format = (value) => Number.isFinite(value) ? Number(value).toFixed(precision) : '--';
  const priceFormat = precision >= decimalPlacesForIncrement(increment)
    ? Object.freeze({ minMove, precision, type: 'price' })
    : Object.freeze({ formatter: format, minMove, type: 'custom' });
  return Object.freeze({
    format,
    formatSigned(value) {
      if (!Number.isFinite(value)) return '--';
      const number = Number(value);
      return `${number > 0 ? '+' : ''}${number.toFixed(precision)}`;
    },
    precision,
    priceFormat,
  });
}
