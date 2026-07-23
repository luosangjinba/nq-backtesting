import { readWorkstationSettings } from '../workstation-settings/public.js';

/** Apply Settings to Replay Workspace DOM through the same reversible transaction as chart consumers. */
export function createWorkstationSettingsViewConsumer({ view }) {
  if (typeof view?.setWorkstationSettings !== 'function') {
    throw new TypeError('Workstation Settings view consumer requires setWorkstationSettings().');
  }
  const stages = new WeakMap();
  let committed = null;

  function record(staged, expected) {
    const value = stages.get(staged);
    if (!value || value.state !== expected) {
      throw new TypeError(`Workstation Settings view stage must be ${expected}.`);
    }
    return value;
  }

  return Object.freeze({
    id: 'replay-workspace-ui:presentation',
    stage(snapshot) {
      if (!snapshot || !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0) {
        throw new TypeError('Workstation Settings view revision is invalid.');
      }
      readWorkstationSettings(snapshot.settings);
      const staged = Object.freeze({ revision: snapshot.revision });
      stages.set(staged, {
        next: snapshot,
        previous: committed,
        state: 'staged',
      });
      return staged;
    },
    apply(staged) {
      const value = record(staged, 'staged');
      view.setWorkstationSettings(value.next);
      value.state = 'applied';
      return Object.freeze({ revision: staged.revision });
    },
    commit(staged) {
      const value = record(staged, 'applied');
      committed = value.next;
      value.state = 'committed';
    },
    rollback(staged) {
      const value = stages.get(staged);
      if (!value || value.state === 'staged' || value.state === 'rolled-back') return;
      if (value.previous !== null) view.setWorkstationSettings(value.previous);
      committed = value.previous;
      value.state = 'rolled-back';
    },
  });
}
