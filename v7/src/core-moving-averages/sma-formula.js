import { failMovingAverages } from './package-error.js';

function exactInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== 'displayBars,length,warmupBars'
    || !Array.isArray(value.displayBars) || !Array.isArray(value.warmupBars)) {
    failMovingAverages('MOVING_AVERAGES_INPUT_INVALID', 'SMA requires exact display and warmup Bar arrays.');
  }
  if (!Number.isInteger(value.length) || value.length < 2 || value.length > 500) {
    failMovingAverages('MOVING_AVERAGES_LENGTH_INVALID', 'SMA length must be an integer from 2 to 500.');
  }
  return value;
}

function readBar(value, previousTime, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== 'close,displayEpochMs'
    || !Number.isSafeInteger(value.displayEpochMs) || value.displayEpochMs < 0
    || value.displayEpochMs <= previousTime || !Number.isFinite(value.close)) {
    failMovingAverages('MOVING_AVERAGES_BAR_INVALID', `${label} Bars must have finite close values and strictly increasing time.`);
  }
  return value;
}

function canonicalNumber(value) {
  if (!Number.isFinite(value)) {
    failMovingAverages('MOVING_AVERAGES_OUTPUT_INVALID', 'SMA produced a non-finite value.');
  }
  return Object.is(value, -0) ? 0 : value;
}

/** Calculate exact full-only SMA(close) points with explicit leading whitespace. */
export function calculateSmaClose(input) {
  const value = exactInput(input);
  const window = [];
  const points = [];
  let previousTime = -1;
  let sum = 0;

  function accept(candidate, emit) {
    const bar = readBar(candidate, previousTime, emit ? 'Display' : 'Warmup');
    previousTime = bar.displayEpochMs;
    window.push(bar.close);
    sum += bar.close;
    if (window.length > value.length) sum -= window.shift();
    if (!emit) return;
    points.push(Object.freeze(window.length < value.length
      ? { displayEpochMs: bar.displayEpochMs, state: 'whitespace' }
      : {
        displayEpochMs: bar.displayEpochMs,
        state: 'value',
        value: canonicalNumber(sum / value.length),
      }));
  }

  value.warmupBars.forEach((bar) => accept(bar, false));
  value.displayBars.forEach((bar) => accept(bar, true));
  return Object.freeze(points);
}

/** Map the pure SMA point list to the Definition-declared complete Plot output. */
export function executeSmaCloseFormula({ displayBars, parameters, warmupBars } = {}) {
  if (!parameters || typeof parameters !== 'object'
    || Object.keys(parameters).sort().join(',') !== 'length') {
    failMovingAverages(
      'MOVING_AVERAGES_PARAMETERS_INVALID',
      'SMA execution requires the exact normalized length parameter.',
    );
  }
  const points = calculateSmaClose({ displayBars, length: parameters.length, warmupBars });
  return Object.freeze([Object.freeze({
    plotGroupId: 'sma-price',
    plots: Object.freeze([Object.freeze({ kind: 'line', plotId: 'sma', points })]),
  })]);
}
