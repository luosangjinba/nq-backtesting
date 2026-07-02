import { createFallbackInstance } from './chart-engine-fallback-adapter.js';
import { createLightweightInstance } from './chart-engine-lightweight-adapter.js';

export function createChartEngineAdapter({
  engine = globalThis.LightweightCharts,
  documentRef = globalThis.document,
} = {}) {
  if (engine?.createChart) {
    if (!documentRef?.createElement) {
      throw new Error('Chart engine adapter requires a document for Lightweight Charts shell.');
    }
    return createLightweightInstance({ engine, documentRef });
  }
  if (!documentRef?.createElement) {
    throw new Error('Chart engine adapter requires a document for DOM fallback.');
  }
  return createFallbackInstance({ documentRef });
}
