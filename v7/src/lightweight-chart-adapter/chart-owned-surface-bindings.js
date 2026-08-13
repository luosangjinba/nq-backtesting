import { createAnnotationSurfaceBinding } from './annotation-surface-binding.js';
import { createCalculatedSeriesChartSurface } from './calculated-series-chart-surface.js';

/** Lazily bind removable child surfaces while the mounted Chart remains the sole native owner. */
export function createChartOwnedSurfaceBindings({
  annotationOptions,
  calculatedSeriesOptions,
} = {}) {
  const annotation = createAnnotationSurfaceBinding(annotationOptions);
  let calculatedSeries = null;
  let calculatedSeriesFactory = null;
  let disposed = false;

  return Object.freeze({
    annotationSurface(projectionApi, paneId) {
      if (disposed) throw new Error('Chart-owned surface bindings are disposed.');
      return annotation.bind(projectionApi, paneId);
    },
    async calculatedSeriesProjectionFactory() {
      if (disposed) throw new Error('Chart-owned surface bindings are disposed.');
      if (calculatedSeriesFactory !== null) return calculatedSeriesFactory;
      const {
        createCalculatedSeriesChartProjectionFactory,
        requireCalculatedSeriesChartProjectionFactory,
      } = await import('../calculated-series-chart-projection/public.js');
      if (disposed) throw new Error('Chart-owned surface bindings are disposed.');
      if (calculatedSeriesFactory !== null) return calculatedSeriesFactory;
      calculatedSeries ??= createCalculatedSeriesChartSurface(calculatedSeriesOptions);
      calculatedSeriesFactory = createCalculatedSeriesChartProjectionFactory({
        surfaceAdapter: calculatedSeries,
      });
      requireCalculatedSeriesChartProjectionFactory(calculatedSeriesFactory);
      return calculatedSeriesFactory;
    },
    dispose() {
      if (disposed) return null;
      disposed = true;
      const cleanup = [annotation.dispose(), calculatedSeries?.dispose() ?? null]
        .filter((value) => value !== null);
      if (cleanup.length === 0) return null;
      return Promise.allSettled(cleanup).then((settled) => {
        const failures = settled.filter(({ status }) => status === 'rejected')
          .map(({ reason }) => reason);
        if (failures.length > 0) throw new AggregateError(failures, 'Chart surface cleanup failed.');
      });
    },
  });
}
