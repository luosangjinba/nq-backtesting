import {
  createWorkstationSettings,
  DEFAULT_WORKSTATION_SETTINGS,
  readWorkstationSettings,
} from '../workstation-settings/public.js';

const TABS = Object.freeze([
  Object.freeze({ id: 'symbol', label: 'Symbol' }),
  Object.freeze({ id: 'status', label: 'Status line' }),
  Object.freeze({ id: 'scales', label: 'Scales and lines' }),
  Object.freeze({ id: 'canvas', label: 'Canvas' }),
]);

function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  for (const child of children) if (child) node.append(child);
  return node;
}

function informationalPanel(title, copy) {
  return element('section', { className: 'workstation-settings-info' }, [
    element('span', { className: 'workstation-settings-kicker', text: title }),
    element('p', { text: copy }),
  ]);
}

/** Own one disposable Settings draft and no committed/persistence/chart state. */
export function createWorkstationSettingsDialog({ getSnapshot, onSave }) {
  if (typeof getSnapshot !== 'function' || typeof onSave !== 'function') {
    throw new TypeError('Workstation Settings dialog requires getSnapshot() and onSave().');
  }
  const grid = element('input', { type: 'checkbox' });
  grid.name = 'gridVisible';
  const gridTrack = element('span', { className: 'workstation-settings-switch-track' });
  const gridRow = element('label', { className: 'workstation-settings-row' }, [
    element('span', { className: 'workstation-settings-row-copy' }, [
      element('strong', { text: 'Grid lines' }),
      element('small', { text: 'Show horizontal and vertical chart guides.' }),
    ]),
    element('span', { className: 'workstation-settings-switch' }, [grid, gridTrack]),
  ]);
  const panels = new Map([
    ['symbol', informationalPanel(
      'Symbol',
      'Candle appearance and price precision remain on the current chart defaults.',
    )],
    ['status', informationalPanel(
      'Status line',
      'Symbol, interval, OHLC, and change remain visible with their accepted behavior.',
    )],
    ['scales', informationalPanel(
      'Scales and lines',
      'Current-price labels and lines remain on their accepted chart defaults.',
    )],
    ['canvas', element('section', { className: 'workstation-settings-canvas' }, [
      element('span', { className: 'workstation-settings-kicker', text: 'Chart basic styles' }),
      gridRow,
    ])],
  ]);
  const tabs = new Map();
  const tabRail = element('nav', { className: 'workstation-settings-tabs' });
  tabRail.setAttribute('aria-label', 'Settings categories');
  tabRail.setAttribute('role', 'tablist');
  const panelHost = element('div', { className: 'workstation-settings-panel' });
  for (const tab of TABS) {
    const button = element('button', {
      className: 'workstation-settings-tab', text: tab.label, type: 'button',
    });
    button.dataset.settingsTab = tab.id;
    button.id = `workstation-settings-tab-${tab.id}`;
    button.setAttribute('aria-controls', `workstation-settings-panel-${tab.id}`);
    button.setAttribute('aria-selected', 'false');
    button.setAttribute('role', 'tab');
    const panel = panels.get(tab.id);
    panel.id = `workstation-settings-panel-${tab.id}`;
    panel.setAttribute('aria-labelledby', button.id);
    panel.setAttribute('role', 'tabpanel');
    panel.hidden = true;
    button.addEventListener('click', () => selectTab(tab.id));
    tabs.set(tab.id, button);
    tabRail.append(button);
    panelHost.append(panel);
  }
  const validation = element('p', { className: 'workstation-settings-validation' });
  validation.hidden = true;
  const recovery = element('p', { className: 'workstation-settings-recovery' });
  recovery.hidden = true;
  const reset = element('button', {
    className: 'button workstation-settings-reset', text: 'Reset', type: 'button',
  });
  const cancel = element('button', {
    className: 'button workstation-settings-cancel', text: 'Cancel', type: 'button',
  });
  const save = element('button', {
    className: 'button workstation-settings-save', text: 'OK', type: 'button',
  });
  const close = element('button', {
    className: 'workstation-settings-close', text: '×', type: 'button',
  });
  close.setAttribute('aria-label', 'Close Settings');
  const content = element('div', { className: 'workstation-settings-dialog-content' }, [
    element('header', { className: 'workstation-settings-header' }, [
      element('h2', { text: 'Settings' }),
      close,
    ]),
    element('div', { className: 'workstation-settings-body' }, [tabRail, panelHost]),
    recovery,
    validation,
    element('footer', { className: 'workstation-settings-footer' }, [
      reset,
      element('div', { className: 'workstation-settings-footer-actions' }, [cancel, save]),
    ]),
  ]);
  const dialog = element('dialog', { className: 'workstation-settings-dialog' }, [content]);
  dialog.setAttribute('aria-labelledby', 'workstation-settings-title');
  content.querySelector('h2').id = 'workstation-settings-title';
  let activeTab = 'canvas';

  function selectTab(id) {
    if (!tabs.has(id)) return;
    activeTab = id;
    for (const [tabId, button] of tabs) {
      const active = tabId === id;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      panels.get(tabId).hidden = !active;
    }
  }

  function populate(settings) {
    const value = readWorkstationSettings(settings);
    grid.checked = value.canvas.gridVisible;
    validation.hidden = true;
    validation.textContent = '';
  }

  function discard() {
    if (dialog.open) dialog.close();
  }

  function saveDraft() {
    validation.hidden = true;
    let outcome;
    try {
      outcome = onSave(createWorkstationSettings({
        canvas: { gridVisible: grid.checked },
      }));
    } catch (error) {
      outcome = Object.freeze({ accepted: false, message: error?.message });
    }
    if (outcome?.accepted === true) {
      dialog.close();
      return;
    }
    validation.textContent = outcome?.message ?? 'Settings could not be saved.';
    validation.hidden = false;
    save.focus();
  }

  reset.addEventListener('click', () => populate(createWorkstationSettings(
    DEFAULT_WORKSTATION_SETTINGS,
  )));
  cancel.addEventListener('click', discard);
  close.addEventListener('click', discard);
  save.addEventListener('click', saveDraft);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    discard();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) discard();
  });
  selectTab(activeTab);

  return Object.freeze({
    dispose() { dialog.remove(); },
    element: dialog,
    open() {
      const snapshot = getSnapshot();
      populate(snapshot.settings);
      recovery.hidden = snapshot.recoveryCode === null;
      recovery.textContent = snapshot.recoveryCode === null
        ? ''
        : 'Stored Settings were unavailable or invalid. Defaults are active until a successful save.';
      selectTab(activeTab);
      dialog.showModal();
      (activeTab === 'canvas' ? grid : tabs.get(activeTab)).focus();
    },
  });
}

/** Compose the compact launcher with its owned modal without exposing DOM wiring. */
export function createWorkstationSettingsControl(options) {
  const dialog = createWorkstationSettingsDialog(options);
  const root = element('button', {
    className: 'button replay-action-button workstation-settings-open',
    text: 'Settings',
    type: 'button',
  });
  root.setAttribute('aria-label', 'Open Settings');
  root.addEventListener('click', dialog.open);
  return Object.freeze({
    dialog: dialog.element,
    dispose() {
      root.removeEventListener('click', dialog.open);
      dialog.dispose();
    },
    root,
    setDisabled(disabled) { root.disabled = disabled === true; },
  });
}
