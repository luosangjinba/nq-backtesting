function requireCallback(value, name) {
  if (typeof value !== 'function') {
    throw new TypeError(`Workspace publication requires ${name}().`);
  }
  return value;
}

/** Own reversible UI/durable publication staging behind the global coordinator. */
export function createWorkspacePublicationPort({
  initialAccepted = null,
  onApply,
  onFinalize,
  onReject,
  onRollback,
}) {
  const applyCandidate = requireCallback(onApply, 'onApply');
  const finalizeCandidate = requireCallback(onFinalize, 'onFinalize');
  const rejectCandidate = requireCallback(onReject, 'onReject');
  const rollbackCandidate = requireCallback(onRollback, 'onRollback');
  const stages = new WeakMap();
  let accepted = initialAccepted;

  function recordFor(stage) {
    const record = stages.get(stage);
    if (!record) throw new TypeError('Workspace publication stage is foreign.');
    return record;
  }

  return Object.freeze({
    apply(stage) {
      const record = recordFor(stage);
      if (record.state !== 'staged') {
        throw new TypeError('Only a staged Workspace publication may apply.');
      }
      record.state = 'applying';
      try {
        applyCandidate(record.candidate);
        record.state = 'applied';
      } catch (error) {
        try { rollbackCandidate(record.previous, record.candidate); } catch { /* Preserve publication failure. */ }
        try { rejectCandidate(); } catch { /* Preserve publication failure. */ }
        record.state = 'rolled-back';
        throw error;
      }
    },
    finalize(stage) {
      const record = recordFor(stage);
      if (record.state !== 'applied') {
        throw new TypeError('Only an applied Workspace publication may finalize.');
      }
      finalizeCandidate(record.candidate);
      accepted = record.candidate;
      record.state = 'finalized';
    },
    reject() { rejectCandidate(); },
    rollback(stage) {
      const record = recordFor(stage);
      if (record.state === 'rolled-back') return;
      if (record.state === 'finalized') {
        throw new TypeError('A finalized Workspace publication cannot roll back.');
      }
      if (record.state === 'applied' || record.state === 'applying') {
        rollbackCandidate(record.previous, record.candidate);
      }
      rejectCandidate();
      record.state = 'rolled-back';
    },
    snapshot: () => Object.freeze({ accepted }),
    stage({ candidate }) {
      const stage = Object.freeze({});
      stages.set(stage, { candidate, previous: accepted, state: 'staged' });
      return stage;
    },
  });
}
