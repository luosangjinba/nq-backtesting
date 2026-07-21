const MINUTE = 60_000;
const SEARCH_WINDOW_MS = 7 * 24 * 60 * MINUTE;

function active(signal) {
  if (signal.aborted) throw Object.assign(new Error('Replay source traversal is stale.'), {
    code: 'foundation-source-traversal-stale',
  });
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
      const cachedBars = cached(context, context.cursorEpochMs, context.range.endEpochMs);
      const cachedSource = cachedBars.find(({ startEpochMs }) => startEpochMs >= context.cursorEpochMs);
      if (cachedSource) return Object.freeze({
        sourceEpochMs: cachedSource.startEpochMs,
        targetEpochMs: Math.min(context.range.endEpochMs, cachedSource.startEpochMs + MINUTE),
      });
      for (let start = context.cursorEpochMs; start < context.range.endEpochMs;) {
        const end = Math.min(context.range.endEpochMs, start + SEARCH_WINDOW_MS);
        const bars = await acquire(context, start, end);
        const source = bars.find(({ startEpochMs }) => startEpochMs >= context.cursorEpochMs);
        if (source) return Object.freeze({
          sourceEpochMs: source.startEpochMs,
          targetEpochMs: Math.min(context.range.endEpochMs, source.startEpochMs + MINUTE),
        });
        start = end;
      }
      return null;
    },
    async previousEligible(context) {
      const cachedBars = cached(context, context.range.startEpochMs, context.cursorEpochMs);
      if (cachedBars.length > 0) {
        const last = cachedBars.at(-1);
        return Object.freeze({
          sourceEpochMs: cachedBars.at(-2)?.startEpochMs ?? null,
          targetEpochMs: last.startEpochMs,
        });
      }
      let end = context.cursorEpochMs;
      while (end > context.range.startEpochMs) {
        const start = Math.max(context.range.startEpochMs, end - SEARCH_WINDOW_MS);
        const bars = await acquire(context, start, end);
        const visible = bars.filter(({ startEpochMs }) => startEpochMs < context.cursorEpochMs);
        if (visible.length > 0) {
          const last = visible.at(-1);
          const previous = visible.at(-2) ?? null;
          return Object.freeze({
            sourceEpochMs: previous?.startEpochMs ?? null,
            targetEpochMs: last.startEpochMs,
          });
        }
        end = start;
      }
      return null;
    },
  });
}
