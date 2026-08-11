import { createLightweightAnnotationChartSurface } from './annotation-chart-surface.js';
import { failLightweightAdapter } from './adapter-error.js';

/** Bind at most one Annotation port identity to a Pane Chart and own its cleanup. */
export function createAnnotationSurfaceBinding({
  chart,
  eventTarget,
  host,
  interactionIndex,
  readInstrumentId,
  series,
} = {}) {
  let paneId = null;
  let projectionApi = null;
  let surface = null;
  return Object.freeze({
    bind(nextProjectionApi, nextPaneId) {
      if (surface !== null) {
        if (nextProjectionApi !== projectionApi || nextPaneId !== paneId) {
          failLightweightAdapter(
            'CHART_ANNOTATION_SURFACE_MISMATCH',
            'One Pane Chart adapter cannot bind two Annotation surface identities.',
          );
        }
        return surface;
      }
      paneId = nextPaneId;
      projectionApi = nextProjectionApi;
      surface = createLightweightAnnotationChartSurface({
        chart,
        eventTarget,
        host,
        interactionIndex,
        paneId,
        projectionApi,
        readInstrumentId,
        series,
      });
      return surface;
    },
    dispose() {
      const cleanup = surface?.dispose() ?? null;
      paneId = null;
      projectionApi = null;
      surface = null;
      return cleanup;
    },
  });
}
