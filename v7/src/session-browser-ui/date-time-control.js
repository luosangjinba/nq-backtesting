import { element } from './dom-primitives.js';

const PRECISION_LENGTH = Object.freeze({ minute: 16, second: 19 });

function pad(value) {
  return String(value).padStart(2, '0');
}

/**
 * Owner: session-browser UI adapter.
 * Purpose: convert an epoch into the local, zone-free value consumed by a
 * date-time control without leaking native-input formatting into its caller.
 * Inputs: finite epoch milliseconds and minute/second display precision.
 * Outputs: a `datetime-local` compatible string.
 * Side effects: none.
 * Errors: rejects non-finite epochs and unsupported precision values.
 */
export function formatLocalDateTimeValue(epochMs, precision = 'minute') {
  if (!Number.isFinite(epochMs)) throw new TypeError('Date-time epoch must be finite.');
  if (!Object.hasOwn(PRECISION_LENGTH, precision)) throw new TypeError('Date-time precision is unsupported.');
  const date = new Date(epochMs);
  const value = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return value.slice(0, PRECISION_LENGTH[precision]);
}

/**
 * Owner: session-browser UI adapter.
 * Purpose: normalize the local wall-time value emitted by any conforming
 * date-time presentation adapter into the Session creation epoch contract.
 * Inputs: empty or local date-time string.
 * Outputs: epoch milliseconds, or NaN when empty/invalid.
 * Side effects: none.
 */
export function parseLocalDateTimeValue(value) {
  if (typeof value !== 'string' || value.length === 0) return Number.NaN;
  return new Date(value).getTime();
}

/**
 * Owner: session-browser UI adapter.
 * Purpose: provide the replaceable date-time-control contract currently backed
 * by a native input; a future calendar adapter must expose the same API.
 * Inputs: form name, required state, and minute/second precision.
 * Outputs: owned element plus reset/read/set methods.
 * Side effects: creates one DOM input; it owns no Session or market-data state.
 * Errors: invalid epochs/precision are rejected before mutating the control.
 * Protected invariant: Session creation reads date-times only through this
 * boundary, so replacing the visual picker cannot fork creation semantics.
 */
export function createDateTimeControl({ name, required = true, precision = 'minute' }) {
  if (!Object.hasOwn(PRECISION_LENGTH, precision)) throw new TypeError('Date-time precision is unsupported.');
  const input = element('input', {
    className: 'text-input date-time-input',
    name,
    type: 'datetime-local',
    step: precision === 'second' ? '1' : '60',
    required: required ? '' : null,
  });
  return Object.freeze({
    element: input,
    reset() {
      input.value = '';
    },
    readEpochMs() {
      return parseLocalDateTimeValue(input.value);
    },
    setEpochMs(epochMs) {
      input.value = formatLocalDateTimeValue(epochMs, precision);
    },
    value() {
      return input.value;
    },
  });
}
