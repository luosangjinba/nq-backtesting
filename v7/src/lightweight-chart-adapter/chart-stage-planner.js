import { createChartData } from './chart-data.js';
import { createFutureTimeAxisData } from './future-time-axis.js';
import { planSeriesMutation } from './series-update-plan.js';

function cachedChartData(cache, workspaceSnapshot, accepted) {
  let data = cache?.get(workspaceSnapshot.bars) ?? null;
  if (data === null) {
    data = createChartData(workspaceSnapshot, accepted.bars, accepted.data);
    cache?.set(workspaceSnapshot.bars, data);
  }
  return data;
}

function cachedFutureTimeAxisData(cache, workspaceSnapshot, data) {
  const durationMs = workspaceSnapshot.provenance.displayTimeframeDurationMs;
  const key = `${durationMs}:${data.at(-1).time}`;
  let futureData = cache?.get(key) ?? null;
  if (futureData === null) {
    futureData = createFutureTimeAxisData({
      durationMs,
      latestDisplayEpochMs: data.at(-1).time * 1_000,
    });
    cache?.set(key, futureData);
  }
  return futureData;
}

/** Plan inert Chart stages from the current adapter state without writing a series. */
export function createChartStagePlanner({ readAccepted, readPresentation }) {
  return Object.freeze({
    empty({ identity, instrumentLabel, priceIncrement, signal }) {
      const accepted = readAccepted();
      const current = readPresentation();
      return {
        data: Object.freeze([]),
        futureTimeAxisData: Object.freeze([]),
        identity,
        instrumentLabel: instrumentLabel === undefined ? current.instrumentLabel : instrumentLabel,
        kind: 'empty',
        mutation: planSeriesMutation(accepted.data, []),
        priceIncrement: priceIncrement === undefined ? current.priceIncrement : priceIncrement,
        signal,
        workspaceSnapshot: null,
      };
    },
    ready({
      chartDataCache,
      futureTimeAxisDataCache,
      identity,
      instrumentLabel,
      priceIncrement,
      seriesMutationPlanMemo,
      signal,
      workspaceSnapshot,
    }) {
      const accepted = readAccepted();
      const current = readPresentation();
      const data = cachedChartData(chartDataCache, workspaceSnapshot, accepted);
      return {
        data,
        futureTimeAxisData: cachedFutureTimeAxisData(
          futureTimeAxisDataCache,
          workspaceSnapshot,
          data,
        ),
        identity,
        instrumentLabel: instrumentLabel === undefined ? current.instrumentLabel : instrumentLabel,
        kind: 'ready',
        mutation: seriesMutationPlanMemo?.plan(accepted.data, data)
          ?? planSeriesMutation(accepted.data, data),
        priceIncrement: priceIncrement === undefined ? current.priceIncrement : priceIncrement,
        signal,
        workspaceSnapshot,
      };
    },
  });
}
