import {
  canonicalProjectionValue,
  readCalculatedSeriesPaneSurfaceCandidate,
} from './candidate-value.js';
import {
  createCalculatedSeriesChartProjectionReceipt,
  createPreparedCalculatedSeriesChartProjection,
  readCalculatedSeriesChartProjectionReceipt,
  readPreparedCalculatedSeriesChartProjection,
  requireMatchingCalculatedSeriesChartProjectionReceipt,
} from './prepared-surface.js';
import { failCalculatedSeriesChartProjection } from './projection-error.js';
import { readCalculatedSeriesPaintedReadback } from './painted-readback.js';
import { planCalculatedSeriesChartProjection } from './projection-plan.js';
import { requireCalculatedSeriesChartSurface, requireChartOwnerControls } from './surface-port.js';

const DIGEST = /^sha256:[a-f0-9]{64}$/u;

function canonicalJson(value) {
  return JSON.stringify(canonicalProjectionValue(value));
}

async function defaultDigestCanonical(value) {
  if (typeof globalThis.crypto?.subtle?.digest !== 'function') {
    failCalculatedSeriesChartProjection(
      'CALCULATED_SERIES_CHART_DIGEST_UNAVAILABLE',
      'Projection preparation requires browser-compatible SHA-256.',
    );
  }
  const output = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonicalJson(value)),
  );
  return `sha256:${[...new Uint8Array(output)]
    .map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function exactApplyResult(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== 'readback,stage'
    || !value.stage || typeof value.stage !== 'object'
    || !value.readback || typeof value.readback !== 'object') {
    failCalculatedSeriesChartProjection(
      'CALCULATED_SERIES_CHART_NATIVE_RECEIPT_INVALID',
      'Native surface returned an invalid private stage/readback pair.',
    );
  }
  return value;
}

function settlementIdentity(candidate) {
  return canonicalProjectionValue({
    binding: candidate.chartBinding,
    definitions: candidate.definitions,
    frameIdentities: candidate.projectionFrames.map(({ frameIdentity, provenance }) => ({
      frameIdentity,
      provenance: {
        calculationMode: provenance.calculationMode,
        datasetDigest: provenance.datasetDigest,
        definitionDigest: provenance.definitionDigest,
        executor: provenance.executor,
        formulaDigest: provenance.formulaDigest,
        inputTimelineDigest: provenance.inputTimelineDigest,
        packageDigest: provenance.packageDigest,
        parameterDigest: provenance.parameterDigest,
        warmupCoverage: provenance.warmupCoverage,
      },
    })),
    workspaceDocument: candidate.workspaceDocument,
  });
}

class CalculatedSeriesChartProjectionPort {
  #acceptedDigest = null;
  #acceptedRevision = 0;
  #acceptedSettlementIdentity = null;
  #active = null;
  #controls;
  #digestCanonical;
  #preparations = new WeakMap();
  #revisionDigests = new Map();
  #status = 'ready';
  #surface;

  constructor({ controls, digestCanonical, surface }) {
    this.#controls = requireChartOwnerControls(controls);
    this.#digestCanonical = typeof digestCanonical === 'function'
      ? digestCanonical : defaultDigestCanonical;
    this.#surface = requireCalculatedSeriesChartSurface(surface);
  }

  #requireOperable() {
    if (this.#status === 'disposed' || this.#status === 'disposing') {
      failCalculatedSeriesChartProjection('CALCULATED_SERIES_CHART_PORT_DISPOSED', 'Projection port is disposed.');
    }
    if (this.#status === 'poisoned') {
      failCalculatedSeriesChartProjection('CALCULATED_SERIES_CHART_PORT_POISONED', 'Projection surface requires Chart-owner recovery.');
    }
    if (this.#status !== 'ready') {
      failCalculatedSeriesChartProjection('CALCULATED_SERIES_CHART_PORT_BUSY', 'Projection surface is settling another phase.');
    }
  }

  #record(prepared) {
    readPreparedCalculatedSeriesChartProjection(prepared);
    const record = this.#preparations.get(prepared);
    if (!record || this.#active !== record) {
      failCalculatedSeriesChartProjection(
        'CALCULATED_SERIES_CHART_PREPARATION_STALE',
        'Preparation is missing, foreign, or already settled.',
      );
    }
    return record;
  }

  #requireCurrent(record) {
    if (this.#controls.isBindingCurrent(record.plan.binding, record.mode) !== true) {
      failCalculatedSeriesChartProjection(
        'CALCULATED_SERIES_CHART_BINDING_STALE',
        'Chart owner rejected a stale candle/Workspace binding before mutation.',
      );
    }
  }

  async #digestCandidate(canonical) {
    this.#status = 'preparing';
    try {
      const digest = await this.#digestCanonical(canonical);
      if (typeof digest !== 'string' || !DIGEST.test(digest)) {
        failCalculatedSeriesChartProjection(
          'CALCULATED_SERIES_CHART_DIGEST_INVALID',
          'Canonical digest port returned an invalid SHA-256 identity.',
        );
      }
      return digest;
    } finally {
      this.#status = 'ready';
    }
  }

  #settle(record, state) {
    record.state = state;
    record.nativeStage = null;
    this.#active = null;
  }

  async #poison(record, phase, cause) {
    this.#status = 'poisoned';
    this.#settle(record, `${phase}-failed`);
    try {
      await this.#controls.reportFault(Object.freeze({
        acceptedSurfaceRevision: this.#acceptedRevision,
        candidateDigest: record.digest,
        phase,
        targetSurfaceRevision: record.targetSurfaceRevision,
      }));
    } catch {
      // The original unprovable native failure remains authoritative.
    }
    failCalculatedSeriesChartProjection(
      `CALCULATED_SERIES_CHART_${phase.toUpperCase()}_UNPROVEN`,
      `Calculated-series ${phase} could not prove native restoration.`,
      { cause },
    );
  }

  async prepare(candidateValue) {
    this.#requireOperable();
    if (this.#active !== null) {
      failCalculatedSeriesChartProjection(
        'CALCULATED_SERIES_CHART_PREPARATION_ACTIVE',
        'Only one complete surface preparation may be active.',
      );
    }
    const candidate = readCalculatedSeriesPaneSurfaceCandidate(candidateValue);
    if (candidate.baseSurfaceRevision !== this.#acceptedRevision) {
      failCalculatedSeriesChartProjection(
        'CALCULATED_SERIES_CHART_BASE_REVISION_STALE',
        'Candidate base surface revision is stale.',
      );
    }
    const planned = planCalculatedSeriesChartProjection(candidateValue);
    if (this.#controls.isBindingCurrent(planned.plan.binding, candidate.mode) !== true) {
      failCalculatedSeriesChartProjection(
        'CALCULATED_SERIES_CHART_BINDING_STALE',
        'Chart owner rejected a stale candle/Workspace binding before preparation.',
      );
    }
    const candidateSettlementIdentity = settlementIdentity(planned.candidate);
    if (candidate.mode === 'same-snapshot-settlement'
      && (this.#acceptedSettlementIdentity === null
        || canonicalJson(candidateSettlementIdentity)
          !== canonicalJson(this.#acceptedSettlementIdentity))) {
      failCalculatedSeriesChartProjection(
        'CALCULATED_SERIES_CHART_SETTLEMENT_IDENTITY_MISMATCH',
        'Same-snapshot settlement changed accepted document, instance, Definition, frame, or Chart identity.',
      );
    }
    try {
      this.#surface.preflight(planned.plan);
    } catch (cause) {
      failCalculatedSeriesChartProjection(
        'CALCULATED_SERIES_CHART_PREPARE_FAILED',
        'Native projection capability preflight failed without mutation.',
        { cause },
      );
    }
    const candidateDigest = await this.#digestCandidate(planned.canonical);
    const priorDigest = this.#revisionDigests.get(candidate.targetSurfaceRevision);
    if (priorDigest && priorDigest !== candidateDigest) {
      failCalculatedSeriesChartProjection(
        'CALCULATED_SERIES_CHART_REVISION_COLLISION',
        'One target surface revision was reused with different canonical content.',
      );
    }
    this.#revisionDigests.set(candidate.targetSurfaceRevision, candidateDigest);
    const record = {
      digest: candidateDigest,
      mode: candidate.mode,
      nativeStage: null,
      plan: planned.plan,
      prepared: null,
      readback: null,
      receipt: null,
      settlementIdentity: candidateSettlementIdentity,
      state: 'prepared',
      targetSurfaceRevision: candidate.targetSurfaceRevision,
    };
    const prepared = createPreparedCalculatedSeriesChartProjection(
      () => Object.freeze({
        baseSurfaceRevision: candidate.baseSurfaceRevision,
        candidateDigest,
        mode: candidate.mode,
        state: record.state,
        targetSurfaceRevision: candidate.targetSurfaceRevision,
      }),
      Object.freeze({
        apply: (value) => this.apply(value),
        dispose: (value) => this.rollback(value, record.receipt),
        finalize: (value, receipt) => this.finalize(value, receipt),
        rollback: (value, receipt) => this.rollback(value, receipt),
      }),
    );
    record.prepared = prepared;
    this.#preparations.set(prepared, record);
    this.#active = record;
    return prepared;
  }

  async apply(prepared) {
    this.#requireOperable();
    const record = this.#record(prepared);
    if (record.state !== 'prepared') {
      failCalculatedSeriesChartProjection('CALCULATED_SERIES_CHART_PHASE_INVALID', 'Only a prepared surface can apply.');
    }
    this.#requireCurrent(record);
    record.state = 'applying';
    this.#status = 'applying';
    try {
      const nativeResult = await this.#surface.apply(record.plan);
      if (nativeResult?.stage && typeof nativeResult.stage === 'object') {
        record.nativeStage = nativeResult.stage;
      }
      const applied = exactApplyResult(nativeResult);
      record.nativeStage = applied.stage;
      record.readback = readCalculatedSeriesPaintedReadback(applied.readback, record.plan);
      this.#requireCurrent(record);
      record.state = 'applied';
      record.receipt = createCalculatedSeriesChartProjectionReceipt(prepared, Object.freeze({
        baseSurfaceRevision: this.#acceptedRevision,
        candidateDigest: record.digest,
        mode: record.mode,
        paintedReadback: record.readback,
        targetSurfaceRevision: record.targetSurfaceRevision,
      }));
      this.#status = 'ready';
      return record.receipt;
    } catch (cause) {
      if (record.nativeStage !== null) {
        try {
          await this.#surface.rollback(record.nativeStage);
          record.nativeStage = null;
        } catch (rollbackCause) {
          return this.#poison(
            record,
            'apply',
            new AggregateError([cause, rollbackCause]),
          );
        }
      } else if (cause?.recoveryUnproven === true
        || cause?.code === 'CALCULATED_SERIES_CHART_NATIVE_RECEIPT_INVALID') {
        return this.#poison(record, 'apply', cause);
      }
      this.#settle(record, 'rolled-back');
      this.#status = 'ready';
      failCalculatedSeriesChartProjection(
        'CALCULATED_SERIES_CHART_APPLY_FAILED',
        'Native projection apply failed and restored the prior surface.',
        { cause },
      );
    }
  }

  async rollback(prepared, receipt = null) {
    this.#requireOperable();
    const record = this.#record(prepared);
    if (record.state === 'prepared') {
      if (receipt !== null) {
        failCalculatedSeriesChartProjection('CALCULATED_SERIES_CHART_RECEIPT_UNEXPECTED', 'Unapplied preparation cannot accept a receipt.');
      }
      this.#settle(record, 'rolled-back');
      return this.snapshot();
    }
    if (record.state !== 'applied') {
      failCalculatedSeriesChartProjection('CALCULATED_SERIES_CHART_PHASE_INVALID', 'Only an applied surface can roll back.');
    }
    requireMatchingCalculatedSeriesChartProjectionReceipt(receipt, prepared);
    this.#status = 'rolling-back';
    try {
      await this.#surface.rollback(record.nativeStage);
      this.#settle(record, 'rolled-back');
      this.#status = 'ready';
      return this.snapshot();
    } catch (cause) {
      return this.#poison(record, 'rollback', cause);
    }
  }

  async finalize(prepared, receipt) {
    this.#requireOperable();
    const record = this.#record(prepared);
    if (record.state !== 'applied') {
      failCalculatedSeriesChartProjection('CALCULATED_SERIES_CHART_PHASE_INVALID', 'Only an applied surface can finalize.');
    }
    requireMatchingCalculatedSeriesChartProjectionReceipt(receipt, prepared);
    this.#requireCurrent(record);
    this.#acceptedDigest = record.digest;
    this.#acceptedRevision = record.targetSurfaceRevision;
    this.#acceptedSettlementIdentity = record.settlementIdentity;
    for (const revision of this.#revisionDigests.keys()) {
      if (revision <= this.#acceptedRevision) this.#revisionDigests.delete(revision);
    }
    record.state = 'finalizing';
    this.#status = 'finalizing';
    try {
      await this.#surface.finalize(record.nativeStage);
      this.#settle(record, 'finalized');
      this.#status = 'ready';
      return this.snapshot();
    } catch (cause) {
      return this.#poison(record, 'finalize', cause);
    }
  }

  snapshot() {
    return Object.freeze({
      acceptedCandidateDigest: this.#acceptedDigest,
      acceptedSurfaceRevision: this.#acceptedRevision,
      activePreparation: this.#active === null ? null : Object.freeze({
        mode: this.#active.mode,
        state: this.#active.state,
        targetSurfaceRevision: this.#active.targetSurfaceRevision,
      }),
      nativeSurface: Object.freeze(canonicalProjectionValue(this.#surface.snapshot())),
      status: this.#status,
    });
  }

  async dispose() {
    if (this.#status === 'disposed') return;
    if (!['ready', 'poisoned'].includes(this.#status)) {
      failCalculatedSeriesChartProjection('CALCULATED_SERIES_CHART_PORT_BUSY', 'Busy projection port cannot dispose.');
    }
    this.#status = 'disposing';
    const record = this.#active;
    try {
      if (record?.state === 'applied') await this.#surface.rollback(record.nativeStage);
      if (record) this.#settle(record, 'disposed');
      await this.#surface.dispose();
      this.#status = 'disposed';
    } catch (cause) {
      this.#status = 'poisoned';
      failCalculatedSeriesChartProjection(
        'CALCULATED_SERIES_CHART_DISPOSAL_UNPROVEN',
        'Calculated-series native resources were not proven disposed.',
        { cause },
      );
    }
  }
}

class CalculatedSeriesChartProjectionFactoryValue {
  #bound = false;
  #digestCanonical;
  #surface;
  constructor({ digestCanonical, surface }) {
    this.#digestCanonical = digestCanonical;
    this.#surface = surface;
    Object.freeze(this);
  }
  bindChartOwner(controls) {
    if (this.#bound) {
      failCalculatedSeriesChartProjection(
        'CALCULATED_SERIES_CHART_FACTORY_BOUND',
        'Projection factory may bind exactly one Chart owner.',
      );
    }
    this.#bound = true;
    const port = new CalculatedSeriesChartProjectionPort({
      controls,
      digestCanonical: this.#digestCanonical,
      surface: this.#surface,
    });
    return Object.freeze({
      dispose: () => port.dispose(),
      prepare: (candidate) => port.prepare(candidate),
      snapshot: () => port.snapshot(),
    });
  }
}

/** Create an inert factory that exposes projection phases only after Chart-owner binding. */
export function createCalculatedSeriesChartProjectionFactory({
  digestCanonical = defaultDigestCanonical,
  surfaceAdapter,
} = {}) {
  return new CalculatedSeriesChartProjectionFactoryValue({
    digestCanonical,
    surface: requireCalculatedSeriesChartSurface(surfaceAdapter),
  });
}

export function requireCalculatedSeriesChartProjectionFactory(candidate) {
  if (!(candidate instanceof CalculatedSeriesChartProjectionFactoryValue)) {
    failCalculatedSeriesChartProjection(
      'CALCULATED_SERIES_CHART_FACTORY_REQUIRED',
      'Chart owner requires a branded calculated-series projection factory.',
    );
  }
  return candidate;
}
