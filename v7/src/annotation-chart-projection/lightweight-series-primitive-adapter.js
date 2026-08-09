import { readAnnotationProjection } from './annotation-projection.js';
import { failProjection } from './projection-error.js';

function requireSeries(series) {
  for (const method of ['attachPrimitive', 'detachPrimitive']) {
    if (typeof series?.[method] !== 'function') {
      failProjection('ANNOTATION_SERIES_PORT_INVALID', `Series port requires ${method}().`);
    }
  }
  return series;
}

function requireFactory(factory) {
  if (typeof factory !== 'function') {
    failProjection('ANNOTATION_PRIMITIVE_FACTORY_INVALID', 'Primitive factory must be a function.');
  }
  return factory;
}

function requireHandle(handle) {
  if (!handle || typeof handle !== 'object' || !handle.primitive
    || typeof handle.update !== 'function' || typeof handle.destroy !== 'function') {
    failProjection(
      'ANNOTATION_RENDER_PRIMITIVE_INVALID',
      'Render primitive handle requires primitive, update(), and destroy().',
    );
  }
  return handle;
}

/** Create the sole bounded Lightweight Charts Series Primitive mutation adapter. */
export function createLightweightSeriesPrimitiveAdapter({ createPrimitive, series } = {}) {
  const acceptedSeries = requireSeries(series);
  const factory = requireFactory(createPrimitive);
  const states = new WeakMap();
  const activeHandles = new Set();

  function state(handle) {
    requireHandle(handle);
    const value = states.get(handle);
    if (!value) {
      failProjection('ANNOTATION_PRIMITIVE_HANDLE_FOREIGN', 'Primitive handle belongs to another adapter.');
    }
    return value;
  }

  return Object.freeze({
    create(projection) {
      readAnnotationProjection(projection);
      const handle = requireHandle(factory(projection));
      if (states.has(handle)) {
        failProjection('ANNOTATION_PRIMITIVE_HANDLE_REUSED', 'Primitive factory reused one handle.');
      }
      states.set(handle, { attached: false, destroyed: false });
      return handle;
    },
    attach(handle) {
      const value = state(handle);
      if (value.destroyed || value.attached) {
        failProjection('ANNOTATION_PRIMITIVE_PHASE_INVALID', 'Primitive cannot attach in this phase.');
      }
      acceptedSeries.attachPrimitive(handle.primitive);
      value.attached = true;
      activeHandles.add(handle);
    },
    update(handle, projection) {
      const value = state(handle);
      if (value.destroyed || !value.attached) {
        failProjection('ANNOTATION_PRIMITIVE_PHASE_INVALID', 'Only an attached primitive can update.');
      }
      handle.update(projection);
    },
    detach(handle) {
      const value = state(handle);
      if (value.destroyed) {
        failProjection('ANNOTATION_PRIMITIVE_PHASE_INVALID', 'Destroyed primitive cannot detach.');
      }
      if (!value.attached) return;
      acceptedSeries.detachPrimitive(handle.primitive);
      value.attached = false;
      activeHandles.delete(handle);
    },
    destroy(handle) {
      const value = state(handle);
      if (value.attached || value.destroyed) {
        failProjection('ANNOTATION_PRIMITIVE_PHASE_INVALID', 'Detached live primitive required for destroy.');
      }
      handle.destroy();
      value.destroyed = true;
    },
    hitTest(point) {
      const hits = [...activeHandles]
        .map((handle) => handle.hitTest?.(point) ?? null)
        .filter(Boolean)
        .sort((left, right) => left.distancePx - right.distancePx
          || left.projectionId.localeCompare(right.projectionId));
      return hits[0] ?? null;
    },
  });
}
