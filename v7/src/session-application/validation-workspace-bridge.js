function unavailable(message) {
  const error = new Error(message);
  error.code = 'VALIDATION_CAMPAIGN_SOURCE_UNAVAILABLE';
  return error;
}
/** Hold only the currently mounted Workspace's narrow Campaign-facing facades. */
export function createValidationWorkspaceBridge() {
  let active = null;
  let generation = 0;
  let disposed = false;

  function requireActive() {
    if (disposed || active === null) {
      throw unavailable('Open a Replay Workspace before using current Campaign evidence.');
    }
    return active;
  }

  return Object.freeze({
    bind(value) {
      if (disposed || typeof value?.readFvg !== 'function'
        || typeof value?.readSma !== 'function'
        || typeof value?.readCaptureContext !== 'function'
        || typeof value?.observeOutcome !== 'function') {
        throw new TypeError('Validation Workspace bridge binding is invalid.');
      }
      generation += 1;
      const token = generation;
      active = Object.freeze({ ...value, generation: token });
      return Object.freeze({
        unbind() {
          if (active?.generation === token) active = null;
        },
      });
    },
    dispose() { disposed = true; active = null; },
    observeOutcome: (request, signal) => requireActive().observeOutcome(request, signal),
    readCaptureContext: () => requireActive().readCaptureContext(),
    readFvg: (request) => requireActive().readFvg(request),
    readSma: (request) => requireActive().readSma(request),
    snapshot() {
      if (disposed) return Object.freeze({ generation, status: 'disposed' });
      if (active === null) return Object.freeze({ generation, status: 'unavailable' });
      return Object.freeze({
        ...active.readCaptureContext(),
        generation,
        status: 'ready',
      });
    },
  });
}
