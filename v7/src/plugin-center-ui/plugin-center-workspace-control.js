import { element } from './dom-primitives.js';
import { createCorePluginCenterControl } from './plugin-center-control.js';
import { createLocalPluginInstalledControl } from './local-package-installed-control.js';

/** Compose Included and Installed as separate host-owned Plugin Center surfaces. */
export function createPluginCenterWorkspaceControl({
  browser,
  confirmDependencyImpact,
  confirmPlan,
  idFactory,
  onExportDiagnostics,
  onRestart,
  profile,
  store,
} = {}) {
  const core = createCorePluginCenterControl({ confirmDependencyImpact, onRestart, profile });
  const installed = createLocalPluginInstalledControl({
    browser, confirmPlan, idFactory, onExportDiagnostics, store,
  });
  const root = element('section', { className: 'plugin-center-workspace' });
  const tabList = element('div', { className: 'plugin-center-surface-tabs' });
  tabList.setAttribute('aria-label', 'Plugin Center sections');
  tabList.setAttribute('role', 'tablist');
  const panel = element('div', { className: 'plugin-center-surface-panel' });
  const surfaces = new Map([
    ['core', { control: core, label: 'Included' }],
    ['installed', { control: installed, label: 'Installed' }],
  ]);
  let active = 'core';

  function select(id, { focus = false } = {}) {
    if (!surfaces.has(id)) return;
    active = id;
    for (const [surfaceId, { button, control }] of surfaces) {
      const selected = surfaceId === id;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      control.root.hidden = !selected;
    }
    root.dataset.pluginCenterSurface = id;
    if (focus) surfaces.get(id).control.focus();
  }

  for (const [id, surface] of surfaces) {
    const button = element('button', { className: 'plugin-center-surface-tab', text: surface.label, type: 'button' });
    button.setAttribute('role', 'tab');
    button.addEventListener('click', () => select(id, { focus: true }));
    surface.control.root.setAttribute('aria-label', `${surface.label} Plugin Center section`);
    surface.control.root.setAttribute('role', 'tabpanel');
    surface.button = button;
    tabList.append(button);
    panel.append(surface.control.root);
  }
  tabList.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const ids = [...surfaces.keys()];
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const next = ids[(ids.indexOf(active) + direction + ids.length) % ids.length];
    select(next);
    surfaces.get(next).button.focus();
  });
  root.append(tabList, panel);
  select(active);
  return Object.freeze({
    dispose() {
      core.dispose(); installed.dispose(); root.remove();
    },
    focus() { surfaces.get(active).control.focus(); },
    root,
    select,
  });
}
