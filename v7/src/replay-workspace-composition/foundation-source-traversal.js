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
    if (sourceEpochMs === null || bar.startEpochMs > sourceEpochMs) sourceEpochMs = bar.startEpochMs;
  }
  return sourceEpochMs;
}

/** Resolve Replay targets through callback-scoped Bar Data Runtime coverage. */
export function createFoundationSourceTraversal({ barData, market }) {
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

  async function withWindow(context, startEpochMs, endEpochMs, visit) {
    active(context.signal);
    const selected = selection(context);
    const result = await barData.withAcquiredCoverage({
      identity: context.identity,
      request: market.requestWindow({
        instrumentId: context.instrumentId,
        windowEndEpochMs: endEpochMs,
        windowStartEpochMs: startEpochMs,
      }),
      signal: context.signal,
      visit: (batch) => visit(eligibleBars(batch, selected)),
    });
    active(context.signal);
    return result;
  }

  async function withForwardBucket(context, exclusiveEndEpochMs, visit) {
    if (typeof market.requestThrough !== 'function') return null;
    active(context.signal);
    const selected = selection(context);
    const request = market.requestThrough(
      exclusiveEndEpochMs,
      selected,
      null,
      context.replayStep.durationMs,
    );
    const result = await barData.withAcquiredCoverage({
      identity: context.identity,
      request,
      signal: context.signal,
      visit: (batch) => visit(
        eligibleBars(batch, selected),
        batch.request.windowEndEpochMs,
      ),
    });
    active(context.signal);
    return result;
  }

  return Object.freeze({
    async eligibleAtOrAfter(context) {
      return withWindow(
        context,
        context.anchorEpochMs,
        context.windowEndEpochMs,
        (bars) => {
          const source = bars.find(({ startEpochMs }) => startEpochMs >= context.anchorEpochMs);
          if (!source) return null;
          return Object.freeze({
            sourceEpochMs: source.startEpochMs,
            targetEpochMs: Math.min(context.range.endEpochMs, source.startEpochMs + MINUTE),
          });
        },
      );
    },
    async nextEligible(context) {
      const currentBucketStart = stepBucketEnd(context.cursorEpochMs, context.replayStep)
        - context.replayStep.durationMs;
      const searchStart = Math.max(context.range.startEpochMs, currentBucketStart);
      if (typeof market.requestThrough === 'function') {
        let probeEpochMs = Math.min(context.range.endEpochMs, context.cursorEpochMs + MINUTE);
        while (probeEpochMs <= context.range.endEpochMs) {
          const acquired = await withForwardBucket(context, probeEpochMs, (bars, windowEndEpochMs) => (
            Object.freeze({ target: nextCompletedStep(bars, context), windowEndEpochMs })
          ));
          if (acquired.target) return acquired.target;
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
        const target = await withWindow(context, start, end, (bars) => nextCompletedStep(bars, context));
        if (target) return target;
        start = end;
      }
      return null;
    },
    async previousEligible(context) {
      let end = context.cursorEpochMs;
      while (end > context.range.startEpochMs) {
        const start = Math.max(context.range.startEpochMs, end - SEARCH_WINDOW_MS);
        const target = await withWindow(
          context,
          start,
          end,
          (bars) => previousCompletedStep(bars, context),
        );
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
      let end = Math.min(targetEpochMs, context.range.endEpochMs);
      while (end > context.range.startEpochMs) {
        const start = Math.max(context.range.startEpochMs, end - SEARCH_WINDOW_MS);
        const requestEnd = end - start <= MINUTE
          ? Math.min(context.range.endEpochMs, end + MINUTE)
          : end;
        if (requestEnd <= start) break;
        const sourceEpochMs = await withWindow(
          context,
          start,
          requestEnd,
          (bars) => latestSourceBefore(bars, targetEpochMs),
        );
        if (sourceEpochMs !== null) return Object.freeze({ sourceEpochMs, targetEpochMs });
        end = start;
      }
      return Object.freeze({ sourceEpochMs: null, targetEpochMs });
    },
  });
}
