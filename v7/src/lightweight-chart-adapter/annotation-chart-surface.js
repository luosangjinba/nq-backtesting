import { failLightweightAdapter } from './adapter-error.js';

const PROJECTION_FACTORIES = Object.freeze([
  'createChartAnnotationPreviewPort',
  'createChartAnnotationProjectionPort',
  'createLightweightAnnotationInteractionPort',
  'createLightweightSeriesPrimitiveAdapter',
  'createRectangleRenderPrimitive',
  'createSegmentRenderPrimitive',
  'readAnnotationProjection',
]);

function requireProjectionApi(value) {
  for (const method of PROJECTION_FACTORIES) {
    if (typeof value?.[method] !== 'function') {
      failLightweightAdapter(
        'CHART_ANNOTATION_PROJECTION_PORT_INVALID',
        `Annotation Chart projection port requires ${method}().`,
      );
    }
  }
  return value;
}

function createPrimitiveFactory(api) {
  return (candidate) => {
    const projection = api.readAnnotationProjection(candidate);
    if (projection.geometry.typeId === 'geometry.rectangle') {
      return api.createRectangleRenderPrimitive(candidate);
    }
    if (projection.geometry.typeId === 'geometry.segment') {
      return api.createSegmentRenderPrimitive(candidate);
    }
    failLightweightAdapter(
      'CHART_ANNOTATION_GEOMETRY_UNSUPPORTED',
      `No Chart Annotation renderer is registered for ${projection.geometry.typeId}.`,
    );
  };
}

function primitiveAdapter(api, series) {
  return api.createLightweightSeriesPrimitiveAdapter({
    createPrimitive: createPrimitiveFactory(api),
    series,
  });
}

/**
 * Adapt one private Lightweight Charts Pane into bounded Annotation ports.
 * Vendor Chart/Series/DOM handles remain closed over by the shared Chart owner;
 * callers receive only interaction, accepted projection, Preview, and snapshot ports.
 */
export function createLightweightAnnotationChartSurface({
  chart,
  eventTarget,
  host,
  interactionIndex,
  paneId,
  projectionApi,
  readInstrumentId,
  series,
} = {}) {
  const api = requireProjectionApi(projectionApi);
  if (typeof interactionIndex?.barAt !== 'function' || typeof readInstrumentId !== 'function') {
    failLightweightAdapter(
      'CHART_ANNOTATION_CONTEXT_INVALID',
      'Annotation Chart surface requires exact Bar and instrument readers.',
    );
  }
  const acceptedPort = api.createChartAnnotationProjectionPort({
    primitiveAdapter: primitiveAdapter(api, series),
  });
  const previewPort = api.createChartAnnotationPreviewPort({
    primitiveAdapter: primitiveAdapter(api, series),
  });
  const interactionPort = api.createLightweightAnnotationInteractionPort({
    chart,
    eventTarget,
    host,
    paneId,
    resolveInstrumentId: () => readInstrumentId(),
    resolveMarketEpochMs: ({ displayEpochMs }) => (
      interactionIndex.barAt(displayEpochMs)?.startEpochMs ?? null
    ),
    resolveSelectionAt: (point) => acceptedPort.hitTest(point),
    series,
  });
  let disposed = false;

  return Object.freeze({
    acceptedPort,
    interactionPort,
    paneId,
    previewPort,
    async dispose() {
      if (disposed) return;
      disposed = true;
      interactionPort.dispose();
      const settled = await Promise.allSettled([
        previewPort.dispose(),
        acceptedPort.dispose(),
      ]);
      const failures = settled
        .filter(({ status }) => status === 'rejected')
        .map(({ reason }) => reason);
      if (failures.length > 0) {
        throw new AggregateError(failures, `Annotation Chart surface ${paneId} cleanup failed.`);
      }
    },
    snapshot: () => Object.freeze({
      accepted: acceptedPort.snapshot(),
      disposed,
      interaction: interactionPort.snapshot(),
      paneId,
      preview: previewPort.snapshot(),
    }),
  });
}
