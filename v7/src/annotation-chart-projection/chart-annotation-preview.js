import { readAnnotationProjection } from './annotation-projection.js';
import { readAnnotationPreviewIdentity } from './preview-identity.js';
import { requireAnnotationPrimitiveAdapter } from './primitive-adapter-port.js';
import { AnnotationChartProjectionError, failProjection } from './projection-error.js';
import {
  applyAnnotationProjectionPlan,
  destroyDetachedAnnotationPrimitives,
  disposeAnnotationPrimitiveRecords,
  rollbackAnnotationProjectionMutations,
} from './projection-mutations.js';
import { planAnnotationProjection } from './projection-plan.js';

const MAX_PREVIEW_PROJECTIONS = 8;

function previewList(projections) {
  if (!Array.isArray(projections) || projections.length > MAX_PREVIEW_PROJECTIONS) {
    failProjection(
      'ANNOTATION_PREVIEW_LIST_INVALID',
      `Preview projections must be an array with at most ${MAX_PREVIEW_PROJECTIONS} entries.`,
    );
  }
  for (const projection of projections) readAnnotationProjection(projection);
  return Object.freeze([...projections]);
}

class ChartAnnotationPreviewPort {
  #adapter;
  #boundIdentity = null;
  #currentRecords = new Map();
  #drainPromise = null;
  #processing = false;
  #queued = null;
  #state = 'ready';

  constructor(adapter) {
    this.#adapter = requireAnnotationPrimitiveAdapter(adapter);
  }

  #requireReady() {
    if (this.#state === 'disposed' || this.#state === 'disposing') {
      failProjection('ANNOTATION_PREVIEW_PORT_DISPOSED', 'Annotation Preview port is disposed.');
    }
    if (this.#state === 'poisoned') {
      failProjection('ANNOTATION_PREVIEW_PORT_POISONED', 'Annotation Preview port requires reconstruction.');
    }
  }

  #requireIdentity(identity, { allowBind }) {
    readAnnotationPreviewIdentity(identity);
    if (this.#boundIdentity === null && allowBind) this.#boundIdentity = identity;
    if (this.#boundIdentity !== identity) {
      failProjection(
        'ANNOTATION_PREVIEW_IDENTITY_MISMATCH',
        'Preview operation does not own the active Preview identity.',
      );
    }
  }

  #result(outcome) {
    return Object.freeze({ outcome, snapshot: this.snapshot() });
  }

  #rejectQueued(error) {
    if (this.#queued === null) return;
    const queued = this.#queued;
    this.#queued = null;
    queued.reject(error);
  }

  async #reconcile(request) {
    const mutations = [];
    const plan = planAnnotationProjection(this.#currentRecords, request.projections);
    let applied;
    try {
      applied = await applyAnnotationProjectionPlan(this.#adapter, plan, mutations);
    } catch (cause) {
      try {
        await rollbackAnnotationProjectionMutations(this.#adapter, mutations);
      } catch (rollbackCause) {
        this.#state = 'poisoned';
        failProjection(
          'ANNOTATION_PREVIEW_ROLLBACK_FAILED',
          'Preview mutation failed and exact transient rollback was not proven.',
          { cause: new AggregateError([cause, rollbackCause]) },
        );
      }
      failProjection(
        'ANNOTATION_PREVIEW_APPLY_FAILED',
        'Preview mutation failed and restored the prior transient projection.',
        { cause },
      );
    }
    this.#currentRecords = applied.nextRecords;
    try {
      await destroyDetachedAnnotationPrimitives(this.#adapter, mutations);
    } catch (cause) {
      this.#state = 'poisoned';
      failProjection(
        'ANNOTATION_PREVIEW_CLEANUP_FAILED',
        'Preview changed but obsolete primitive cleanup failed.',
        { cause },
      );
    }
    if (request.kind === 'clear') this.#boundIdentity = null;
  }

  async #drain() {
    this.#processing = true;
    try {
      while (this.#queued !== null && this.#state !== 'disposing') {
        const request = this.#queued;
        this.#queued = null;
        try {
          await this.#reconcile(request);
          request.resolve(this.#result('applied'));
        } catch (error) {
          request.reject(error);
          if (this.#state === 'poisoned') {
            this.#rejectQueued(error);
            break;
          }
        }
      }
    } finally {
      this.#processing = false;
      this.#drainPromise = null;
    }
  }

  #enqueue(kind, identity, projections) {
    this.#requireReady();
    this.#requireIdentity(identity, { allowBind: kind === 'replace' });
    const result = new Promise((resolve, reject) => {
      if (this.#queued !== null) this.#queued.resolve(this.#result('superseded'));
      this.#queued = { identity, kind, projections, reject, resolve };
    });
    if (this.#drainPromise === null) this.#drainPromise = this.#drain();
    return result;
  }

  replace(identity, projections) {
    return this.#enqueue('replace', identity, previewList(projections));
  }

  clear(identity) {
    return this.#enqueue('clear', identity, Object.freeze([]));
  }

  snapshot() {
    return Object.freeze({
      activePreviewId: this.#boundIdentity === null
        ? null : readAnnotationPreviewIdentity(this.#boundIdentity),
      processing: this.#processing,
      projectionCount: this.#currentRecords.size,
      projectionIds: Object.freeze([...this.#currentRecords.keys()].sort()),
      queueDepth: this.#queued === null ? 0 : 1,
      status: this.#state,
    });
  }

  async dispose() {
    if (this.#state === 'disposed') return this.snapshot();
    if (this.#state === 'disposing') {
      failProjection('ANNOTATION_PREVIEW_PORT_BUSY', 'Annotation Preview port is disposing.');
    }
    this.#state = 'disposing';
    this.#rejectQueued(new AnnotationChartProjectionError(
      'ANNOTATION_PREVIEW_PORT_DISPOSED',
      'Annotation Preview port disposed before queued replacement.',
    ));
    if (this.#drainPromise !== null) await this.#drainPromise.catch(() => {});
    const failures = [];
    try {
      await disposeAnnotationPrimitiveRecords(this.#adapter, this.#currentRecords);
    } catch (error) { failures.push(error); }
    this.#adapter = null;
    this.#boundIdentity = null;
    this.#currentRecords = new Map();
    this.#state = 'disposed';
    if (failures.length > 0) {
      failProjection(
        'ANNOTATION_PREVIEW_DISPOSE_FAILED',
        'Annotation Preview disposal completed with primitive cleanup failures.',
        { cause: new AggregateError(failures) },
      );
    }
    return this.snapshot();
  }
}

/** Create one isolated latest-wins transient Annotation Preview owner. */
export function createChartAnnotationPreviewPort({ primitiveAdapter } = {}) {
  const owner = new ChartAnnotationPreviewPort(primitiveAdapter);
  return Object.freeze({
    clear: owner.clear.bind(owner),
    dispose: owner.dispose.bind(owner),
    replace: owner.replace.bind(owner),
    snapshot: owner.snapshot.bind(owner),
  });
}
