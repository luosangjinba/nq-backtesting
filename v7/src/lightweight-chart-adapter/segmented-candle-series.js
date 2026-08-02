import {
  CandlestickSeries,
} from '../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs';
import { CANDLE_OPTIONS } from './chart-options.js';

const SEGMENT_BAR_LIMIT = 512;

function immutableState({ logicalLength, prefix, segments, tail }) {
  return Object.freeze({ logicalLength, prefix, segments: Object.freeze(segments), tail });
}

function segmentOptions(options, visible = true) {
  return Object.freeze({
    ...options,
    lastValueVisible: false,
    priceLineVisible: false,
    title: '',
    visible,
  });
}

/**
 * Keep accepted history stable while Replay writes only bounded recent chunks.
 * Full replacement remains available for history/timeframe/session mutations.
 */
export function createSegmentedCandleSeriesWriter({ chart, onDataChanged, primarySeries }) {
  let options = CANDLE_OPTIONS;
  let state = immutableState({ logicalLength: 0, prefix: Object.freeze([]), segments: [], tail: Object.freeze([]) });
  let viewport = Object.freeze({ mode: 'all', range: null });
  const observedSeries = new Set();
  const visibility = new WeakMap();

  function observe(series) {
    series.subscribeDataChanged(onDataChanged);
    observedSeries.add(series);
    return series;
  }

  function remove(segment) {
    if (!observedSeries.has(segment.series)) return;
    segment.series.unsubscribeDataChanged(onDataChanged);
    observedSeries.delete(segment.series);
    chart.removeSeries(segment.series);
  }

  function setVisible(segment, visible) {
    if (visibility.get(segment.series) === visible) return;
    segment.series.applyOptions({ visible });
    visibility.set(segment.series, visible);
  }

  function desiredVisibility(segment) {
    if (viewport.mode === 'all' || viewport.range === null) return true;
    return segment.toIndex >= Math.floor(viewport.range.from) - 1
      && segment.fromIndex <= Math.ceil(viewport.range.to) + 1;
  }

  function syncVisibility(segments = state.segments) {
    for (const segment of segments) setVisible(segment, desiredVisibility(segment));
  }

  function createSegment(data, fromIndex) {
    const series = observe(chart.addSeries(CandlestickSeries, segmentOptions(options)));
    try {
      series.setData(data);
    } catch (error) {
      try { remove({ series }); } catch { /* Preserve the data-write failure. */ }
      throw error;
    }
    visibility.set(series, true);
    return Object.freeze({ data, fromIndex, series, toIndex: fromIndex + data.length - 1 });
  }

  function nextSegments(previous, data, fromIndex, created) {
    if (data.length === 0) return previous;
    const segments = [...previous];
    const latest = segments.at(-1) ?? null;
    let offset = 0;
    if (latest && latest.data.length < SEGMENT_BAR_LIMIT) {
      const accepted = data.slice(0, SEGMENT_BAR_LIMIT - latest.data.length);
      const combined = Object.freeze([...latest.data, ...accepted]);
      latest.series.setData(combined);
      segments[segments.length - 1] = Object.freeze({
        data: combined,
        fromIndex: latest.fromIndex,
        series: latest.series,
        toIndex: fromIndex + accepted.length - 1,
      });
      offset = accepted.length;
    }
    while (offset < data.length) {
      const chunk = Object.freeze(data.slice(offset, offset + SEGMENT_BAR_LIMIT));
      const segment = createSegment(chunk, fromIndex + offset);
      created.push(segment);
      segments.push(segment);
      offset += chunk.length;
    }
    return segments;
  }

  function replaceAll(data, previous) {
    primarySeries.setData(data);
    for (const segment of previous.segments) segment.series.setData([]);
    return immutableState({
      logicalLength: data.length,
      prefix: Object.freeze(data.slice(0, -1)),
      segments: [],
      tail: Object.freeze(data.length > 0 ? [data.at(-1)] : []),
    });
  }

  function updateTail(data, previous) {
    const bar = data.at(-1);
    primarySeries.update({ ...bar });
    const appended = data.length > previous.logicalLength;
    return immutableState({
      ...previous,
      logicalLength: data.length,
      tail: Object.freeze(appended
        ? [...previous.tail, bar]
        : [...previous.tail.slice(0, -1), bar]),
    });
  }

  function appendReplacement(data, previous, created) {
    const changed = Object.freeze(data.slice(previous.logicalLength - 1));
    const replacement = changed[0];
    const latest = changed.at(-1);
    primarySeries.update({ ...replacement });
    if (latest.time !== replacement.time) primarySeries.update({ ...latest });
    return immutableState({
      ...previous,
      logicalLength: data.length,
      segments: nextSegments(
        previous.segments,
        Object.freeze(changed.slice(0, -1)),
        previous.logicalLength - 1,
        created,
      ),
      tail: Object.freeze([
        ...previous.tail.slice(0, -1), replacement,
        ...(latest.time === replacement.time ? [] : [latest]),
      ]),
    });
  }

  function restore(previous, candidate) {
    primarySeries.setData([...previous.prefix, ...previous.tail]);
    for (const segment of previous.segments) segment.series.setData(segment.data);
    for (const segment of candidate.segments) {
      if (!previous.segments.some(({ series }) => series === segment.series)) remove(segment);
    }
    state = previous;
  }

  observe(primarySeries);
  return Object.freeze({
    applyOptions(nextOptions) {
      primarySeries.applyOptions(nextOptions);
      options = nextOptions;
      for (const segment of state.segments) {
        segment.series.applyOptions(segmentOptions(nextOptions, desiredVisibility(segment)));
      }
    },
    dispose() {
      for (const segment of state.segments) remove(segment);
      primarySeries.unsubscribeDataChanged(onDataChanged);
      observedSeries.delete(primarySeries);
    },
    finalize(token) {
      if (!token || token.candidate !== state) return;
      for (const segment of token.orphaned) remove(segment);
      token.status = 'finalized';
    },
    hasSeriesData(seriesData) {
      return seriesData?.has(primarySeries) === true
        || state.segments.some(({ series }) => seriesData?.has(series) === true);
    },
    mutate(data, mutation) {
      const previous = state;
      const created = [];
      try {
        const candidate = mutation.kind === 'full-replace'
          ? replaceAll(data, previous)
          : mutation.kind === 'append-replace'
            ? appendReplacement(data, previous, created)
            : updateTail(data, previous);
        state = candidate;
        syncVisibility(candidate.segments);
        return {
          candidate,
          created: Object.freeze(created),
          orphaned: mutation.kind === 'full-replace' ? previous.segments : Object.freeze([]),
          previous,
          status: 'applied',
        };
      } catch (error) {
        restore(previous, immutableState({ ...state, segments: [...state.segments, ...created] }));
        throw error;
      }
    },
    primarySeries,
    rollback(token) {
      if (!token || token.status !== 'applied' || token.candidate !== state) return;
      restore(token.previous, token.candidate);
      syncVisibility();
      token.status = 'rolled-back';
    },
    setVisibleLogicalRange(range, origin = 'default') {
      viewport = Object.freeze({
        mode: origin === 'manual' ? 'all' : 'range',
        range: range === null ? null : Object.freeze({ from: range.from, to: range.to }),
      });
      syncVisibility();
    },
    showAll() {
      viewport = Object.freeze({ mode: 'all', range: viewport.range });
      syncVisibility();
    },
    snapshot: () => Object.freeze({
      segmentBarLimit: SEGMENT_BAR_LIMIT,
      segmentCount: state.segments.length,
      segmentPointCount: state.segments.reduce((total, segment) => total + segment.data.length, 0),
      visibleSegmentCount: state.segments.filter((segment) => visibility.get(segment.series) !== false).length,
      viewportMode: viewport.mode,
    }),
  });
}
