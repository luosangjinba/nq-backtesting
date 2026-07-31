const DEFAULT_LEFT_BUFFER_BARS = 24;
const DEFAULT_REPLACEMENT_SPAN_BARS = 80;
const MINIMUM_HISTORY_DISPLAY_BARS = 240;
const HISTORY_FILL_SAFETY_BARS = 8;

function requireHistoryState(state) {
  const from = state?.logicalRange?.from;
  const to = state?.logicalRange?.to;
  if (!Number.isSafeInteger(state?.barCount) || state.barCount < 1
    || !Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
    throw new TypeError('Pane history state requires a positive bar count and increasing logical range.');
  }
  return state;
}

function requireViewportState(state) {
  if (!state || !Number.isFinite(state.latestOffsetBars)
    || (state.spanBars !== null && (!Number.isFinite(state.spanBars) || state.spanBars <= 0))) {
    throw new TypeError('Replacement history requires finite Viewport wall semantics.');
  }
  return state;
}

/**
 * Convert the current native left-side gap into one display-bar acquisition
 * target. The target reaches the Canvas edge plus the accepted 24-bar buffer;
 * it does not create a post-commit continuation chain.
 */
export function planSingleHistoryFill(state, {
  leftBufferBars = DEFAULT_LEFT_BUFFER_BARS,
  minimumDisplayBars = MINIMUM_HISTORY_DISPLAY_BARS,
} = {}) {
  const value = requireHistoryState(state);
  if (!Number.isFinite(leftBufferBars) || leftBufferBars < 0
    || !Number.isSafeInteger(minimumDisplayBars) || minimumDisplayBars < 1) {
    throw new TypeError('History fill policy requires a non-negative buffer and positive minimum.');
  }
  const missingThroughBuffer = Math.ceil(leftBufferBars - value.logicalRange.from)
    + HISTORY_FILL_SAFETY_BARS;
  return Object.freeze({
    displayBars: Math.max(minimumDisplayBars, missingThroughBuffer),
    logicalRange: Object.freeze({ ...value.logicalRange }),
  });
}

/**
 * Plan the complete target snapshot before a projection replacement applies a
 * dense manual Viewport to a differently sized series. This is the pre-commit
 * equivalent of measuring the negative logical gap after replacement.
 */
export function planReplacementHistoryFill(viewportState, {
  defaultSpanBars = DEFAULT_REPLACEMENT_SPAN_BARS,
  leftBufferBars = DEFAULT_LEFT_BUFFER_BARS,
  minimumDisplayBars = MINIMUM_HISTORY_DISPLAY_BARS,
} = {}) {
  const value = requireViewportState(viewportState);
  if (!Number.isFinite(defaultSpanBars) || defaultSpanBars <= 0
    || !Number.isFinite(leftBufferBars) || leftBufferBars < 0
    || !Number.isSafeInteger(minimumDisplayBars) || minimumDisplayBars < 1) {
    throw new TypeError('Replacement history policy requires positive spans/targets and a non-negative buffer.');
  }
  const spanBars = value.spanBars ?? defaultSpanBars;
  const displayBars = Math.max(
    minimumDisplayBars,
    Math.ceil(spanBars - value.latestOffsetBars + leftBufferBars + 1)
      + HISTORY_FILL_SAFETY_BARS,
  );
  if (!Number.isSafeInteger(displayBars) || displayBars < 1) {
    throw new TypeError('Replacement history target must be a positive safe integer.');
  }
  return Object.freeze({ displayBars });
}
