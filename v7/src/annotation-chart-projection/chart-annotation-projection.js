import {
  createAnnotationProjectionReceipt,
  createPreparedAnnotationProjection,
  readPreparedAnnotationProjection,
  requireMatchingAnnotationProjectionReceipt,
} from './prepared-projection.js';
import { requireAnnotationPrimitiveAdapter } from './primitive-adapter-port.js';
import { failProjection } from './projection-error.js';
import {
  applyAnnotationProjectionPlan,
  destroyDetachedAnnotationPrimitives,
  disposeAnnotationPrimitiveRecords,
  rollbackAnnotationProjectionMutations,
} from './projection-mutations.js';
import { planAnnotationProjection } from './projection-plan.js';

function requireAnnotationRevision(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    failProjection(
      'ANNOTATION_PROJECTION_ANNOTATION_REVISION_INVALID',
      'Annotation revision must be a non-negative safe integer.',
    );
  }
  return value;
}

class ChartAnnotationProjectionPort {
  #acceptedAnnotationRevision = null;
  #acceptedRecords = new Map();
  #active = null;
  #adapter;
  #preparations = new WeakMap();
  #status = 'ready';

  constructor(adapter) {
    this.#adapter = requireAnnotationPrimitiveAdapter(adapter);
  }

  #requireOperable() {
    if (this.#status === 'disposed' || this.#status === 'disposing') {
      failProjection('ANNOTATION_PROJECTION_PORT_DISPOSED', 'Projection port is disposed.');
    }
    if (this.#status === 'poisoned') {
      failProjection('ANNOTATION_PROJECTION_PORT_POISONED', 'Projection port requires reconstruction.');
    }
    if (this.#status !== 'ready') {
      failProjection('ANNOTATION_PROJECTION_PORT_BUSY', 'Projection port is settling another operation.');
    }
  }

  #record(prepared) {
    readPreparedAnnotationProjection(prepared);
    const record = this.#preparations.get(prepared);
    if (!record || this.#active !== record) {
      failProjection(
        'ANNOTATION_PROJECTION_PREPARATION_STALE',
        'Projection preparation is missing, foreign, or already settled.',
      );
    }
    return record;
  }

  #settle(record, state) {
    record.state = state;
    this.#active = null;
  }

  async #reverse(record, cause = null) {
    try {
      await rollbackAnnotationProjectionMutations(this.#adapter, record.mutations);
      this.#settle(record, 'rolled-back');
      this.#status = 'ready';
    } catch (rollbackCause) {
      this.#status = 'poisoned';
      this.#settle(record, 'rollback-failed');
      failProjection(
        'ANNOTATION_PROJECTION_ROLLBACK_FAILED',
        'Projection mutation failed and exact visible rollback was not proven.',
        { cause: cause === null ? rollbackCause : new AggregateError([cause, rollbackCause]) },
      );
    }
  }

  prepare(annotationRevision, projections) {
    this.#requireOperable();
    const target = requireAnnotationRevision(annotationRevision);
    if (this.#active !== null) {
      failProjection(
        'ANNOTATION_PROJECTION_PREPARATION_ACTIVE',
        'One projection preparation is already active.',
      );
    }
    if (this.#acceptedAnnotationRevision !== null && target <= this.#acceptedAnnotationRevision) {
      failProjection(
        'ANNOTATION_PROJECTION_ANNOTATION_REVISION_STALE',
        'Annotation revision must advance beyond the accepted projection revision.',
      );
    }
    const plan = planAnnotationProjection(this.#acceptedRecords, projections);
    const prepared = createPreparedAnnotationProjection(Object.freeze({
      annotationRevision: target,
      baseAnnotationRevision: this.#acceptedAnnotationRevision,
      projectionCount: plan.candidates.length,
      schemaVersion: 1,
    }));
    const record = {
      annotationRevision: target,
      mutations: [],
      nextRecords: null,
      plan,
      prepared,
      receipt: null,
      state: 'prepared',
    };
    this.#preparations.set(prepared, record);
    this.#active = record;
    return prepared;
  }

  async apply(prepared) {
    this.#requireOperable();
    const record = this.#record(prepared);
    if (record.state !== 'prepared') {
      failProjection('ANNOTATION_PROJECTION_PHASE_INVALID', 'Only a prepared projection can apply.');
    }
    record.state = 'applying';
    this.#status = 'applying';
    try {
      const applied = await applyAnnotationProjectionPlan(
        this.#adapter,
        record.plan,
        record.mutations,
      );
      record.nextRecords = applied.nextRecords;
      record.state = 'applied';
      record.receipt = createAnnotationProjectionReceipt(prepared, Object.freeze({
        annotationRevision: record.annotationRevision,
        projectionCount: record.nextRecords.size,
        schemaVersion: 1,
      }));
      this.#status = 'ready';
      return record.receipt;
    } catch (cause) {
      await this.#reverse(record, cause);
      failProjection(
        'ANNOTATION_PROJECTION_APPLY_FAILED',
        'Projection apply failed and restored the prior visible set.',
        { cause },
      );
    }
  }

  async rollback(prepared, receipt = null) {
    this.#requireOperable();
    const record = this.#record(prepared);
    if (record.state === 'prepared') {
      if (receipt !== null) {
        failProjection(
          'ANNOTATION_PROJECTION_RECEIPT_UNEXPECTED',
          'An unapplied preparation cannot accept a receipt.',
        );
      }
      this.#settle(record, 'rolled-back');
      return this.snapshot();
    }
    if (record.state !== 'applied') {
      failProjection('ANNOTATION_PROJECTION_PHASE_INVALID', 'Projection cannot roll back in this phase.');
    }
    requireMatchingAnnotationProjectionReceipt(receipt, prepared);
    this.#status = 'rolling-back';
    await this.#reverse(record);
    return this.snapshot();
  }

  async finalize(prepared, receipt) {
    this.#requireOperable();
    const record = this.#record(prepared);
    if (record.state !== 'applied') {
      failProjection('ANNOTATION_PROJECTION_PHASE_INVALID', 'Only an applied projection can finalize.');
    }
    requireMatchingAnnotationProjectionReceipt(receipt, prepared);
    this.#acceptedRecords = record.nextRecords;
    this.#acceptedAnnotationRevision = record.annotationRevision;
    this.#settle(record, 'finalized');
    this.#status = 'finalizing';
    try {
      await destroyDetachedAnnotationPrimitives(this.#adapter, record.mutations);
      this.#status = 'ready';
    } catch (cause) {
      this.#status = 'poisoned';
      failProjection(
        'ANNOTATION_PROJECTION_FINALIZE_FAILED',
        'Projection accepted but obsolete primitive cleanup failed.',
        { cause },
      );
    }
    return this.snapshot();
  }

  snapshot() {
    return Object.freeze({
      acceptedAnnotationRevision: this.#acceptedAnnotationRevision,
      activePreparation: this.#active === null ? null : Object.freeze({
        annotationRevision: this.#active.annotationRevision,
        state: this.#active.state,
      }),
      projectionCount: this.#acceptedRecords.size,
      projectionIds: Object.freeze([...this.#acceptedRecords.keys()].sort()),
      status: this.#status,
    });
  }

  async dispose() {
    if (this.#status === 'disposed') return this.snapshot();
    if (['applying', 'finalizing', 'rolling-back', 'disposing'].includes(this.#status)) {
      failProjection('ANNOTATION_PROJECTION_PORT_BUSY', 'Projection port is settling another operation.');
    }
    this.#status = 'disposing';
    const failures = [];
    if (this.#active?.state === 'applied') {
      try {
        await rollbackAnnotationProjectionMutations(this.#adapter, this.#active.mutations);
      } catch (error) { failures.push(error); }
    }
    if (this.#active !== null) this.#settle(this.#active, 'disposed');
    try {
      await disposeAnnotationPrimitiveRecords(this.#adapter, this.#acceptedRecords);
    } catch (error) { failures.push(error); }
    this.#acceptedRecords = new Map();
    this.#acceptedAnnotationRevision = null;
    this.#adapter = null;
    this.#status = 'disposed';
    if (failures.length > 0) {
      failProjection(
        'ANNOTATION_PROJECTION_DISPOSE_FAILED',
        'Projection port disposal completed with primitive cleanup failures.',
        { cause: new AggregateError(failures) },
      );
    }
    return this.snapshot();
  }
}

/** Create one isolated Chart-owned accepted Annotation projection port. */
export function createChartAnnotationProjectionPort({ primitiveAdapter } = {}) {
  const owner = new ChartAnnotationProjectionPort(primitiveAdapter);
  return Object.freeze({
    apply: owner.apply.bind(owner),
    dispose: owner.dispose.bind(owner),
    finalize: owner.finalize.bind(owner),
    prepare: owner.prepare.bind(owner),
    rollback: owner.rollback.bind(owner),
    snapshot: owner.snapshot.bind(owner),
  });
}
