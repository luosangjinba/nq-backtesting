import { getPdaType } from '../pda/pda-types.js';

export function buildPdaOrderRefMetadata(annotation = {}) {
  const sourceContext = Array.isArray(annotation.contexts)
    ? annotation.contexts.filter(Boolean).join(' · ')
    : '';
  return {
    sourceChartId: annotation.sourceChartId || 'primary',
    sourceChartLabel: annotation.sourceChartLabel || '',
    sourceInstrument: annotation.sourceInstrument || 'NQ',
    sourceTimeframe: annotation.sourceTimeframe ?? null,
    sourceTimeframeLabel: annotation.sourceTimeframeLabel || annotation.timeframe || '',
    sourceContext,
  };
}

export function getPdaOrderRefLabel(annotation = {}) {
  const pdaLabel = getPdaType(annotation.type)?.label || annotation.type?.toUpperCase() || 'PDA';
  const metadata = buildPdaOrderRefMetadata(annotation);
  const source = [metadata.sourceInstrument, metadata.sourceTimeframeLabel].filter(Boolean).join(' ');
  return source ? `${pdaLabel} · ${source}` : pdaLabel;
}

export function buildSegmentOrderRefMetadata(segment = {}) {
  const sourceTimeframeLabel = segment.sourceTimeframeLabel || segment.timeframe || '';
  const sourceInstrument = segment.sourceInstrument || segment.instrument || 'NQ';
  const sourceContext = segment.sourceContext || [sourceInstrument, sourceTimeframeLabel].filter(Boolean).join(' ');
  return {
    sourceChartId: segment.sourceChartId || 'primary',
    sourceChartLabel: segment.sourceChartLabel || '',
    sourceInstrument,
    sourceTimeframe: segment.sourceTimeframe ?? null,
    sourceTimeframeLabel,
    sourceContext,
  };
}

export function getSegmentOrderRefLabel(segment = {}) {
  const direction = segment.direction === 'down' ? 'DOWN' : segment.direction === 'up' ? 'UP' : 'FLAT';
  const segmentLabel = `${segment.timeframe || '1H'} ${direction} LEG`;
  const metadata = buildSegmentOrderRefMetadata(segment);
  const source = [metadata.sourceInstrument, metadata.sourceTimeframeLabel].filter(Boolean).join(' ');
  return source ? `${segmentLabel} · ${source}` : segmentLabel;
}
