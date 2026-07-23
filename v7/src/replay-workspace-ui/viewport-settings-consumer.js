import { readWorkstationSettings } from '../workstation-settings/public.js';

/** Translate global Settings into Viewport-owned future/reset defaults only. */
export function createViewportSettingsConsumer({ viewportDefaultsPort }) {
  if (typeof viewportDefaultsPort?.readDefaultRightMarginBars !== 'function'
    || typeof viewportDefaultsPort?.setDefaultRightMarginBars !== 'function') {
    throw new TypeError('Viewport Settings consumer requires a defaults port.');
  }
  const stages = new WeakMap();

  function record(staged, expected) {
    const value = stages.get(staged);
    if (!value || value.state !== expected) {
      throw new TypeError(`Viewport Settings stage must be ${expected}.`);
    }
    return value;
  }

  return Object.freeze({
    id: 'viewport-runtime:right-margin-default',
    stage(snapshot) {
      const next = readWorkstationSettings(snapshot.settings).canvas.rightMarginBars;
      const staged = Object.freeze({ revision: snapshot.revision });
      stages.set(staged, {
        next,
        previous: viewportDefaultsPort.readDefaultRightMarginBars(),
        state: 'staged',
      });
      return staged;
    },
    apply(staged) {
      const value = record(staged, 'staged');
      viewportDefaultsPort.setDefaultRightMarginBars(value.next);
      value.state = 'applied';
      return Object.freeze({ revision: staged.revision });
    },
    commit(staged) { record(staged, 'applied').state = 'committed'; },
    rollback(staged) {
      const value = stages.get(staged);
      if (!value || value.state === 'staged' || value.state === 'rolled-back') return;
      viewportDefaultsPort.setDefaultRightMarginBars(value.previous);
      value.state = 'rolled-back';
    },
  });
}
