import { requireChartProjectionPort } from './chart-projection-port.js';
import { failContextProjection } from './context-projection-error.js';

function mountedSurface(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== 'paneId,port'
    || typeof value.paneId !== 'string') {
    failContextProjection('CONTEXT_PROJECTION_SURFACE_INVALID', 'Mounted surface is invalid.');
  }
  return Object.freeze({ paneId: value.paneId, port: requireChartProjectionPort(value.port) });
}

/** Validate and deterministically order the mounted subset of one exact projection frame. */
export function mountProjectionSurfaces(surfaces, frame) {
  if (!Array.isArray(surfaces)) {
    failContextProjection('CONTEXT_PROJECTION_SURFACES_INVALID', 'Mounted surfaces must be an array.');
  }
  const mounted = surfaces.map(mountedSurface)
    .sort((left, right) => left.paneId.localeCompare(right.paneId));
  if (new Set(mounted.map(({ paneId }) => paneId)).size !== mounted.length
    || mounted.some(({ paneId }) => !frame.panes.some((pane) => pane.paneId === paneId))) {
    failContextProjection('CONTEXT_PROJECTION_SURFACES_INVALID', 'Mounted Pane ids are invalid.');
  }
  return Object.freeze(mounted);
}

async function rollbackRecords(records) {
  const failures = [];
  for (const record of [...records].reverse()) {
    try { await record.port.rollback(record.prepared, record.receipt); } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length > 0) throw new AggregateError(failures, 'Pane projection rollback failed.');
}

function prepareRecords(records, mounted, byPane, frame) {
  for (const surface of mounted) {
    records.push({
      paneId: surface.paneId,
      port: surface.port,
      prepared: surface.port.prepareReconciliation({
        annotationRevision: frame.annotationRevision,
        projections: byPane.get(surface.paneId).projections,
        reconciliationRevision: frame.reconciliationRevision,
      }),
      receipt: null,
    });
  }
}

async function applyRecords(records) {
  let appliedCount = 0;
  try {
    for (const record of records) {
      record.receipt = await record.port.apply(record.prepared);
      appliedCount += 1;
    }
  } catch (cause) {
    const reversible = [...records.slice(0, appliedCount), ...records.slice(appliedCount + 1)];
    try { await rollbackRecords(reversible); } catch (rollbackCause) {
      failContextProjection(
        'CONTEXT_PROJECTION_ROLLBACK_FAILED',
        'Pane apply failed and exact rollback was not proven.',
        { cause: new AggregateError([cause, rollbackCause]) },
      );
    }
    failContextProjection('CONTEXT_PROJECTION_APPLY_FAILED', 'Pane projection apply failed.', { cause });
  }
}

async function finalizeRecords(records) {
  const failures = [];
  for (const record of records) {
    try { await record.port.finalize(record.prepared, record.receipt); } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length > 0) {
    failContextProjection(
      'CONTEXT_PROJECTION_FINALIZE_FAILED',
      'Pane projection was accepted but cleanup requires reconstruction.',
      { cause: new AggregateError(failures) },
    );
  }
}

/** Settle one already-derived collection through the mounted Chart ports as one decision. */
export async function settlePaneProjectionSets({ accept, frame, mounted, sets }) {
  if (typeof accept !== 'function') {
    failContextProjection('CONTEXT_PROJECTION_ACCEPT_INVALID', 'Settlement requires one decision callback.');
  }
  const byPane = new Map(sets.map((set) => [set.paneId, set]));
  const records = [];
  try { prepareRecords(records, mounted, byPane, frame); } catch (cause) {
    try { await rollbackRecords(records); } catch (rollbackCause) {
      failContextProjection(
        'CONTEXT_PROJECTION_ROLLBACK_FAILED',
        'Pane prepare failed and exact cancellation was not proven.',
        { cause: new AggregateError([cause, rollbackCause]) },
      );
    }
    failContextProjection('CONTEXT_PROJECTION_PREPARE_FAILED', 'Pane projection prepare failed.', { cause });
  }
  await applyRecords(records);
  accept();
  await finalizeRecords(records);
}
