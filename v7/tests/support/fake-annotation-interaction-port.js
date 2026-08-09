/** Create one deterministic normalized gesture source without DOM or vendor handles. */
export function createFakeAnnotationInteractionPort() {
  let active = null;
  let lastHandlers = null;
  let leaseRevision = 0;

  function event(sequence, overrides = {}) {
    const { anchor: anchorOverrides = {}, ...eventOverrides } = overrides;
    return Object.freeze({
      anchor: Object.freeze({
        epochMs: 1_700_000_000_000 + (sequence * 60_000),
        instrumentId: 'instrument.nq',
        price: 100 + sequence,
        ...anchorOverrides,
      }),
      paneId: 'pane-main',
      pointerId: 7,
      sequence,
      ...eventOverrides,
    });
  }

  function requireActive() {
    if (active === null) throw new Error('fake interaction has no active lease');
    return active;
  }

  return Object.freeze({
    acquire(handlers) {
      if (active !== null) throw new Error('fake interaction lease already active');
      const record = { handlers, leaseRevision: ++leaseRevision };
      active = record;
      lastHandlers = handlers;
      return Object.freeze({
        release(reason = 'released') {
          if (active !== record) return;
          active = null;
          handlers.onCancel(Object.freeze({ reason }));
        },
      });
    },
    cancel(reason = 'cancelled') {
      const record = requireActive();
      active = null;
      record.handlers.onCancel(Object.freeze({ reason }));
    },
    end(sequence, overrides = {}) {
      const record = requireActive();
      active = null;
      record.handlers.onEnd(event(sequence, overrides));
    },
    repeatEnd(sequence, overrides = {}) {
      if (lastHandlers === null) throw new Error('fake interaction has no prior lease');
      lastHandlers.onEnd(event(sequence, overrides));
    },
    move(sequence, overrides = {}) { requireActive().handlers.onMove(event(sequence, overrides)); },
    snapshot: () => Object.freeze({ active: active !== null, leaseRevision }),
    start(sequence = 1, overrides = {}) { requireActive().handlers.onStart(event(sequence, overrides)); },
  });
}
