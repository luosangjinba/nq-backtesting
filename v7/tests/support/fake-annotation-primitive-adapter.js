import { readAnnotationProjection } from '../../src/annotation-chart-projection/public.js';

function faultTokens(value) {
  if (value === undefined) return new Set();
  return new Set(Array.isArray(value) ? value : [value]);
}

/** Create one deterministic failure-injectable primitive adapter for R13.4 lifecycle proof. */
export function createFakeAnnotationPrimitiveAdapter({ failAt } = {}) {
  const faults = faultTokens(failAt);
  const counts = { attach: 0, create: 0, destroy: 0, detach: 0, update: 0 };
  const active = new Set();
  const destroyed = new Set();
  const handles = [];
  const trace = [];

  function fault(method, phase) {
    const token = `${method}:${counts[method]}:${phase}`;
    if (faults.has(token)) throw new Error(`fake primitive failure at ${token}`);
  }

  function operation(method, mutate) {
    counts[method] += 1;
    trace.push(`${method}:${counts[method]}`);
    fault(method, 'before');
    const result = mutate();
    fault(method, 'after');
    return result;
  }

  return Object.freeze({
    create(projection) {
      return operation('create', () => {
        const handle = { handleId: handles.length + 1, projection };
        handles.push(handle);
        return handle;
      });
    },
    attach(handle) {
      return operation('attach', () => {
        if (destroyed.has(handle)) throw new Error('cannot attach destroyed handle');
        active.add(handle);
      });
    },
    update(handle, projection) {
      return operation('update', () => {
        if (!active.has(handle) || destroyed.has(handle)) throw new Error('cannot update inactive handle');
        handle.projection = projection;
      });
    },
    detach(handle) {
      return operation('detach', () => { active.delete(handle); });
    },
    destroy(handle) {
      return operation('destroy', () => {
        if (active.has(handle)) throw new Error('cannot destroy active handle');
        destroyed.add(handle);
      });
    },
    inspect() {
      return Object.freeze({
        active: Object.freeze([...active].map(({ handleId }) => handleId).sort((a, b) => a - b)),
        counts: Object.freeze({ ...counts }),
        destroyed: Object.freeze([...destroyed].map(({ handleId }) => handleId).sort((a, b) => a - b)),
        handles: Object.freeze(handles.map((handle) => Object.freeze({
          handleId: handle.handleId,
          projection: readAnnotationProjection(handle.projection),
        }))),
        trace: Object.freeze([...trace]),
      });
    },
  });
}
