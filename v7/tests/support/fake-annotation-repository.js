function fail(stage) {
  throw new Error(`intentional fake Annotation Repository ${stage} failure`);
}

/** Create the R13.3 Harness-only reversible Repository with deterministic fault injection. */
export function createFakeAnnotationRepository({ applyGate = null, failAt = null } = {}) {
  const failures = new Set(Array.isArray(failAt) ? failAt : [failAt]);
  const counts = { apply: 0, finalize: 0, prepare: 0, rollback: 0 };
  const inputs = [];
  let finalized = null;
  let visible = null;

  return Object.freeze({
    inspect() {
      return Object.freeze({
        counts: Object.freeze({ ...counts }),
        finalized,
        inputs: Object.freeze([...inputs]),
        visible,
      });
    },
    prepare(input) {
      counts.prepare += 1;
      inputs.push(input);
      if (failures.has('prepare')) fail('prepare');
      const previous = visible;
      let phase = 'prepared';
      return Object.freeze({
        async apply() {
          counts.apply += 1;
          if (phase !== 'prepared') fail('apply phase');
          if (applyGate !== null) await applyGate;
          if (failures.has('apply')) fail('apply');
          visible = input.candidateDocument;
          phase = 'applied';
        },
        async finalize() {
          counts.finalize += 1;
          if (phase !== 'applied') fail('finalize phase');
          if (failures.has('finalize')) fail('finalize');
          finalized = input.candidateDocument;
          phase = 'finalized';
        },
        async rollback() {
          counts.rollback += 1;
          if (failures.has('rollback')) fail('rollback');
          if (phase === 'finalized' || phase === 'rolled-back') fail('rollback phase');
          visible = previous;
          phase = 'rolled-back';
        },
        snapshot: () => Object.freeze({ phase }),
      });
    },
  });
}
