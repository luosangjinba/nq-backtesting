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
