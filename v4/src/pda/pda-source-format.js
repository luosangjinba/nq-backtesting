import { timeframeToString } from '../config.js';

function normalizeChartLabel(annotation = {}) {
  const chartId = annotation.sourceChartId || annotation.chartId || 'primary';
  const rawLabel = annotation.sourceChartLabel || '';
  if (chartId === 'secondary') return 'Sub';
  if (chartId === 'primary') return 'Pane 1';
  if (chartId === 'comparison-window') return 'Pane 2';
  if (/^secondary$/i.test(rawLabel)) return 'Pane 2';
  if (/^primary$/i.test(rawLabel)) return 'Pane 1';
  if (/^main$/i.test(rawLabel)) return 'Pane 1';
  if (/^comparison(?: window)?$/i.test(rawLabel)) return 'Pane 2';
  return rawLabel || chartId;
}

function normalizeTimeframeLabel(annotation = {}) {
  if (annotation.sourceTimeframeLabel) return annotation.sourceTimeframeLabel;
  if (annotation.timeframe) return annotation.timeframe;
  if (annotation.sourceTimeframe !== undefined && annotation.sourceTimeframe !== null) {
    const numeric = Number(annotation.sourceTimeframe);
    return Number.isFinite(numeric) ? timeframeToString(numeric) : String(annotation.sourceTimeframe);
  }
  return '';
}

export function getPdaSourceParts(annotation = {}) {
  return {
    chartLabel: normalizeChartLabel(annotation),
    instrument: annotation.sourceInstrument || annotation.instrument || 'NQ',
    timeframeLabel: normalizeTimeframeLabel(annotation),
  };
}

export function formatPdaSourceBadge(annotation = {}) {
  const { chartLabel, instrument, timeframeLabel } = getPdaSourceParts(annotation);
  return [chartLabel, instrument, timeframeLabel].filter(Boolean).join(' ');
}

export function formatPdaChartLabel(annotation = {}, pdaLabel = 'PDA') {
  const { instrument, timeframeLabel } = getPdaSourceParts(annotation);
  const source = [instrument, timeframeLabel].filter(Boolean).join(' ');
  return source ? `${pdaLabel} · ${source}` : pdaLabel;
}

export function formatPdaDisplayLabel(annotation = {}, pdaLabel = 'PDA') {
  const source = formatPdaSourceBadge(annotation);
  return source ? `${pdaLabel} · ${source}` : pdaLabel;
}
