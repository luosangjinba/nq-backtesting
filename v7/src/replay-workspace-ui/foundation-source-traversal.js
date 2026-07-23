const MINUTE = 60_000;
const SEARCH_WINDOW_MS = 7 * 24 * 60 * MINUTE;

function active(signal) {
  if (signal.aborted) throw Object.assign(new Error('Replay source traversal is stale.'), {
    code: 'foundation-source-traversal-stale',
  });
}

function stepBucketEnd(startEpochMs, step) {
  const bucketStartEpochMs = Math.floor(
    (startEpochMs - step.offsetMs) / step.durationMs,
  ) * step.durationMs + step.offsetMs;
  return bucketStartEpochMs + step.durationMs;
}

function nextCompletedStep(bars, context) {
  let targetEpochMs = null;
  let sourceEpochMs = null;
  for (const bar of bars) {
    const completion = Math.min(context.range.endEpochMs, stepBucketEnd(bar.startEpochMs, context.replayStep));
    if (completion <= context.cursorEpochMs) continue;
    if (targetEpochMs === null || completion < targetEpochMs) {
      targetEpochMs = completion;
      sourceEpochMs = bar.startEpochMs;
    } else if (completion === targetEpochMs && bar.startEpochMs > sourceEpochMs) {
      sourceEpochMs = bar.startEpochMs;
    }
  }
  return targetEpochMs === null ? null : Object.freeze({ sourceEpochMs, targetEpochMs });
}

function previousCompletedStep(bars, context) {
  let targetEpochMs = null;
  let sourceEpochMs = null;
  for (const bar of bars) {
    const completion = stepBucketEnd(bar.startEpochMs, context.replayStep);
    if (completion >= context.cursorEpochMs || completion < context.range.startEpochMs) continue;
    if (targetEpochMs === null || completion > targetEpochMs) {
      targetEpochMs = completion;
      sourceEpochMs = bar.startEpochMs;
    } else if (completion === targetEpochMs && bar.startEpochMs > sourceEpochMs) {
      sourceEpochMs = bar.startEpochMs;
    }
  }
  return targetEpochMs === null ? null : Object.freeze({ sourceEpochMs, targetEpochMs });
}

function latestSourceBefore(bars, targetEpochMs) {
  let sourceEpochMs = null;
  for (const bar of bars) {
    if (bar.startEpochMs >= targetEpochMs) continue;
    if (sourceEpochMs === null || bar.startEpochMs > sourceEpochMs) {
      sourceEpochMs = bar.startEpochMs;
    }
  }
  return sourceEpochMs;
}

/** Resolve Replay targets from real primary-instrument bars via Bar Data Runtime. */
export function createFoundationSourceTraversal({ barData, market, readCachedSourceBars = () => [] }) {
  function selection(context) {
    return market.catalog.get({
      instrumentId: context.instrumentId,
      sessionHoursMode: context.sessionHours.mode,
      timeframeId: market.defaultTarget.timeframeId,
    });
  }

  function eligibleBars(batch, selected) {
    return batch.bars.filter((bar) => selected.sessionHoursPolicy.isEligible(bar, {
      calendar: selected.calendar,
      instrument: selected.instrument,
      sessionHoursMode: selected.sessionHoursMode,
    }));
  }

  function cached(context, startEpochMs, endEpochMs) {
    const selected = selection(context);
    return readCachedSourceBars(context.instrumentId)
      .filter((bar) => bar.startEpochMs >= startEpochMs && bar.startEpochMs < endEpochMs)
      .filter((bar) => selected.sessionHoursPolicy.isEligible(bar, {
        calendar: selected.calendar,
        instrument: selected.instrument,
        sessionHoursMode: selected.sessionHoursMode,
      }));
  }

  async function acquire(context, startEpochMs, endEpochMs) {
    active(context.signal);
    const batch = await barData.acquire(market.requestWindow({
      instrumentId: context.instrumentId,
      windowEndEpochMs: endEpochMs,
      windowStartEpochMs: startEpochMs,
    }));
    active(context.signal);
    return eligibleBars(batch, selection(context));
  }

  async function acquireForwardBucket(context, exclusiveEndEpochMs) {
    if (typeof market.requestThrough !== 'function') return null;
    active(context.signal);
    const selected = selection(context);
    const batch = await barData.acquire(market.requestThrough(exclusiveEndEpochMs, selected));
    active(context.signal);
    return Object.freeze({
      bars: eligibleBars(batch, selected),
      windowEndEpochMs: batch.request.windowEndEpochMs,
    });
  }

  return Object.freeze({
    async eligibleAtOrAfter(context) {
      const cachedBars = cached(context, context.anchorEpochMs, context.windowEndEpochMs);
      const bars = cachedBars.length > 0
        ? cachedBars : await acquire(context, context.anchorEpochMs, context.windowEndEpochMs);
      const source = bars.find(({ startEpochMs }) => startEpochMs >= context.anchorEpochMs);
      if (!source) return null;
      return Object.freeze({
        sourceEpochMs: source.startEpochMs,
        targetEpochMs: Math.min(context.range.endEpochMs, source.startEpochMs + MINUTE),
      });
    },
    async nextEligible(context) {
      const currentBucketStart = stepBucketEnd(context.cursorEpochMs, context.replayStep)
        - context.replayStep.durationMs;
      const searchStart = Math.max(context.range.startEpochMs, currentBucketStart);
      const cachedTarget = nextCompletedStep(
        cached(context, searchStart, context.range.endEpochMs),
        context,
      );
      if (cachedTarget) return cachedTarget;

      // Pane projection and Replay clock traversal share one exact-window Bar
      // Data Runtime. Probe the same buffered request identity used by pane
      // materialization so repeated Next/Autoplay actions stay cache hits.
      // Advancing by the accepted request end still skips weekends/holidays
      // without creating a new current-minute-to-range-end request each step.
      if (typeof market.requestThrough === 'function') {
        let probeEpochMs = Math.min(context.range.endEpochMs, context.cursorEpochMs + MINUTE);
        while (probeEpochMs <= context.range.endEpochMs) {
          const acquired = await acquireForwardBucket(context, probeEpochMs);
          const target = nextCompletedStep(acquired.bars, context);
          if (target) return target;
          if (acquired.windowEndEpochMs >= context.range.endEpochMs) return null;
          if (acquired.windowEndEpochMs < probeEpochMs) {
            throw new TypeError('Buffered Replay source request did not advance its window.');
          }
          probeEpochMs = acquired.windowEndEpochMs + MINUTE;
        }
        return null;
      }
      for (let start = searchStart; start < context.range.endEpochMs;) {
        const end = Math.min(context.range.endEpochMs, start + SEARCH_WINDOW_MS);
        const bars = await acquire(context, start, end);
        const target = nextCompletedStep(bars, context);
        if (target) return target;
        start = end;
      }
      return null;
    },
    async previousEligible(context) {
      const cachedBars = cached(context, context.range.startEpochMs, context.cursorEpochMs);
      const cachedTarget = previousCompletedStep(cachedBars, context);
      if (cachedTarget) return cachedTarget;
      let end = context.cursorEpochMs;
      while (end > context.range.startEpochMs) {
        const start = Math.max(context.range.startEpochMs, end - SEARCH_WINDOW_MS);
        const bars = await acquire(context, start, end);
        const target = previousCompletedStep(bars, context);
        if (target) return target;
        end = start;
      }
      return context.cursorEpochMs > context.range.startEpochMs
        ? Object.freeze({ sourceEpochMs: null, targetEpochMs: context.range.startEpochMs })
        : null;
    },
    async visibleBefore(context) {
      const targetEpochMs = context.targetEpochMs;
      if (targetEpochMs <= context.range.startEpochMs) {
        return Object.freeze({ sourceEpochMs: null, targetEpochMs });
      }
      const cachedSourceEpochMs = latestSourceBefore(
        cached(context, context.range.startEpochMs, targetEpochMs),
        targetEpochMs,
      );
      if (cachedSourceEpochMs !== null && cachedSourceEpochMs >= targetEpochMs - MINUTE) {
        return Object.freeze({ sourceEpochMs: cachedSourceEpochMs, targetEpochMs });
      }
      let end = Math.min(targetEpochMs, context.range.endEpochMs);
      while (end > context.range.startEpochMs) {
        const start = Math.max(context.range.startEpochMs, end - SEARCH_WINDOW_MS);
        const requestEnd = end - start <= MINUTE
          ? Math.min(context.range.endEpochMs, end + MINUTE)
          : end;
        if (requestEnd <= start) break;
        const bars = await acquire(context, start, requestEnd);
        const sourceEpochMs = latestSourceBefore(bars, targetEpochMs);
        if (sourceEpochMs !== null) return Object.freeze({ sourceEpochMs, targetEpochMs });
        end = start;
      }
      return Object.freeze({ sourceEpochMs: null, targetEpochMs });
    },
  });
}
