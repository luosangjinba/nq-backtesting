import { failProjection } from './projection-error.js';

const METHODS = Object.freeze(['attach', 'create', 'destroy', 'detach', 'update']);

/** Validate the only bounded primitive mutation adapter injected into this Chart owner. */
export function requireAnnotationPrimitiveAdapter(candidate) {
  for (const method of METHODS) {
    if (typeof candidate?.[method] !== 'function') {
      failProjection(
        'ANNOTATION_PRIMITIVE_ADAPTER_INVALID',
        `Annotation primitive adapter requires ${method}().`,
      );
    }
  }
  return candidate;
}

/** Reject null or primitive values returned as adapter-owned handles. */
export function requireAnnotationPrimitiveHandle(candidate) {
  if ((typeof candidate !== 'object' && typeof candidate !== 'function') || candidate === null) {
    failProjection('ANNOTATION_PRIMITIVE_HANDLE_INVALID', 'Primitive adapter returned an invalid handle.');
  }
  return candidate;
}
