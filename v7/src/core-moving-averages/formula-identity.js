/** Portable algorithm identity pinned independently from minification or bundling. */
export const SMA_CLOSE_FORMULA_IDENTITY_WIRE = Object.freeze({
  algorithm: 'simple-moving-average-close',
  canonicalizeNegativeZero: true,
  firstValue: 'length-th-accepted-bar',
  inputOrder: 'warmup-then-display-strictly-increasing',
  numericSemantics: 'ecmascript-binary64-running-sum',
  output: 'explicit-leading-whitespace-then-value',
  schemaVersion: 1,
  source: 'close-fixed',
  state: 'full-only-no-incremental-retention',
  window: 'fifo-add-then-remove-oldest-when-over-length',
});
