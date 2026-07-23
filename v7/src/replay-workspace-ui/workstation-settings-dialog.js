import {
  createWorkstationSettings,
  DEFAULT_WORKSTATION_SETTINGS,
  readWorkstationSettings,
} from '../workstation-settings/public.js';
import { createColorPickerControl } from './color-picker-control.js';

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

function switchControl({ copy, label, name }) {
  const input = element('input', { type: 'checkbox' });
  input.name = name;
  input.setAttribute('aria-label', label);
  const root = element('label', { className: 'workstation-settings-row' }, [
    element('span', { className: 'workstation-settings-row-copy' }, [
      element('strong', { text: label }),
      copy ? element('small', { text: copy }) : null,
    ]),
    element('span', { className: 'workstation-settings-switch' }, [
      input,
      element('span', { className: 'workstation-settings-switch-track' }),
    ]),
  ]);
  return Object.freeze({ input, root });
}

function candleStyleControl({
  downName,
  getRecentColors,
  label,
  onColorChange,
  onPickerOpen,
  upName,
  visibleName,
}) {
  const visible = element('input', { type: 'checkbox' });
  visible.name = visibleName;
  visible.setAttribute('aria-label', `Show candle ${label.toLowerCase()}`);
  const up = createColorPickerControl({
    getRecentColors,
    label: `Up candle ${label.toLowerCase()} color`,
    name: upName,
    onChange: () => onColorChange(upName),
    onOpen: () => onPickerOpen(up),
  });
  const down = createColorPickerControl({
    getRecentColors,
    label: `Down candle ${label.toLowerCase()} color`,
    name: downName,
    onChange: () => onColorChange(downName),
    onOpen: () => onPickerOpen(down),
  });
  const root = element('div', { className: 'workstation-settings-candle-row' }, [
    element('label', { className: 'workstation-settings-candle-toggle' }, [
      visible,
      element('strong', { text: label }),
    ]),
    element('span', { className: 'workstation-settings-color-pair' }, [
      element('label', {}, [element('small', { text: 'Up' }), up.root]),
      element('label', {}, [element('small', { text: 'Down' }), down.root]),
    ]),
  ]);
  return Object.freeze({ down, root, up, visible });
}

/** Own one disposable Settings draft and no committed/persistence/chart state. */
export function createWorkstationSettingsDialog({
  getRecentColors = () => [],
  getSnapshot,
  onRecordRecentColors = () => {},
  onSave,
}) {
  if (typeof getSnapshot !== 'function' || typeof onSave !== 'function') {
    throw new TypeError('Workstation Settings dialog requires getSnapshot() and onSave().');
  }
  const gridControl = switchControl({
    copy: 'Show horizontal and vertical chart guides.', label: 'Grid lines', name: 'gridVisible',
  });
  const grid = gridControl.input;
  const readoutControls = Object.freeze({
    change: switchControl({ label: 'Bar change values', name: 'changeVisible' }),
    ohlc: switchControl({ label: 'Chart values (OHLC)', name: 'ohlcVisible' }),
    volume: switchControl({
      copy: 'Unavailable source volume is shown as Vol —.', label: 'Volume', name: 'volumeVisible',
    }),
  });
  const currentPriceControls = Object.freeze({
    line: switchControl({ label: 'Price line', name: 'currentPriceLineVisible' }),
    name: switchControl({ label: 'Symbol name', name: 'currentPriceNameVisible' }),
    value: switchControl({ label: 'Price value', name: 'currentPriceValueVisible' }),
  });
  const pickerControls = [];
  let touchedColors = [];
  const markColorTouched = (name) => {
    touchedColors = [name, ...touchedColors.filter((candidate) => candidate !== name)];
  };
  const closePickers = (except = null) => {
    for (const picker of pickerControls) if (picker !== except) picker.close();
  };
  const pickerOptions = {
    getRecentColors,
    onColorChange: markColorTouched,
    onPickerOpen: (picker) => closePickers(picker),
  };
  const candleControls = Object.freeze({
    body: candleStyleControl({
      ...pickerOptions,
      downName: 'downBodyColor', label: 'Body', upName: 'upBodyColor', visibleName: 'bodyVisible',
    }),
    borders: candleStyleControl({
      ...pickerOptions,
      downName: 'downBorderColor', label: 'Borders', upName: 'upBorderColor', visibleName: 'bordersVisible',
    }),
    wicks: candleStyleControl({
      ...pickerOptions,
      downName: 'downWickColor', label: 'Wicks', upName: 'upWickColor', visibleName: 'wicksVisible',
    }),
  });
  for (const group of Object.values(candleControls)) pickerControls.push(group.up, group.down);
  const pickerByName = new Map(pickerControls.map((picker) => [picker.input.name, picker]));
  const precision = element('select', { className: 'workstation-settings-precision' });
  precision.name = 'pricePrecision';
  precision.setAttribute('aria-label', 'Price precision');
  const autoOption = element('option', { text: 'Auto — instrument tick size' });
  autoOption.value = 'auto';
  precision.append(autoOption);
  for (let digits = 0; digits <= 15; digits += 1) {
    const option = element('option', {
      text: digits === 0 ? 'Integer' : `${digits} decimal${digits === 1 ? '' : 's'}`,
    });
    option.value = String(digits);
    precision.append(option);
  }
  const panels = new Map([
    ['symbol', element('section', { className: 'workstation-settings-symbol' }, [
      element('span', { className: 'workstation-settings-kicker', text: 'Candles' }),
      candleControls.body.root,
      candleControls.borders.root,
      candleControls.wicks.root,
      element('div', { className: 'workstation-settings-precision-row' }, [
        element('span', { className: 'workstation-settings-row-copy' }, [
          element('strong', { text: 'Precision' }),
          element('small', { text: 'Auto follows each pane instrument tick size.' }),
        ]),
        precision,
      ]),
    ])],
    ['status', element('section', { className: 'workstation-settings-status' }, [
      element('span', { className: 'workstation-settings-kicker', text: 'Content' }),
      readoutControls.ohlc.root,
      readoutControls.change.root,
      readoutControls.volume.root,
    ])],
    ['scales', element('section', { className: 'workstation-settings-scales' }, [
      element('span', { className: 'workstation-settings-kicker', text: 'Current price' }),
      currentPriceControls.name.root,
      currentPriceControls.value.root,
      currentPriceControls.line.root,
      element('p', {
        className: 'workstation-settings-panel-note',
        text: 'Name, value, and line are independent on every pane.',
      }),
    ])],
    ['canvas', element('section', { className: 'workstation-settings-canvas' }, [
      element('span', { className: 'workstation-settings-kicker', text: 'Chart basic styles' }),
      gridControl.root,
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
  let activeTab = 'symbol';

  function selectTab(id) {
    if (!tabs.has(id)) return;
    closePickers();
    activeTab = id;
    for (const [tabId, button] of tabs) {
      const active = tabId === id;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      panels.get(tabId).hidden = !active;
    }
  }

  function populate(settings) {
    closePickers();
    touchedColors = [];
    const value = readWorkstationSettings(settings);
    candleControls.body.visible.checked = value.candles.bodyVisible;
    candleControls.body.up.value = value.candles.upBodyColor;
    candleControls.body.down.value = value.candles.downBodyColor;
    candleControls.borders.visible.checked = value.candles.bordersVisible;
    candleControls.borders.up.value = value.candles.upBorderColor;
    candleControls.borders.down.value = value.candles.downBorderColor;
    candleControls.wicks.visible.checked = value.candles.wicksVisible;
    candleControls.wicks.up.value = value.candles.upWickColor;
    candleControls.wicks.down.value = value.candles.downWickColor;
    precision.value = String(value.candles.pricePrecision);
    grid.checked = value.canvas.gridVisible;
    currentPriceControls.line.input.checked = value.currentPrice.lineVisible;
    currentPriceControls.name.input.checked = value.currentPrice.nameVisible;
    currentPriceControls.value.input.checked = value.currentPrice.valueVisible;
    readoutControls.change.input.checked = value.paneReadout.changeVisible;
    readoutControls.ohlc.input.checked = value.paneReadout.ohlcVisible;
    readoutControls.volume.input.checked = value.paneReadout.volumeVisible;
    validation.hidden = true;
    validation.textContent = '';
  }

  function discard() {
    closePickers();
    if (dialog.open) dialog.close();
  }

  function saveDraft() {
    validation.hidden = true;
    let outcome;
    try {
      outcome = onSave(createWorkstationSettings({
        candles: {
          bodyVisible: candleControls.body.visible.checked,
          bordersVisible: candleControls.borders.visible.checked,
          downBodyColor: candleControls.body.down.value,
          downBorderColor: candleControls.borders.down.value,
          downWickColor: candleControls.wicks.down.value,
          pricePrecision: precision.value === 'auto' ? 'auto' : Number(precision.value),
          upBodyColor: candleControls.body.up.value,
          upBorderColor: candleControls.borders.up.value,
          upWickColor: candleControls.wicks.up.value,
          wicksVisible: candleControls.wicks.visible.checked,
        },
        canvas: { gridVisible: grid.checked },
        currentPrice: {
          lineVisible: currentPriceControls.line.input.checked,
          nameVisible: currentPriceControls.name.input.checked,
          valueVisible: currentPriceControls.value.input.checked,
        },
        paneReadout: {
          changeVisible: readoutControls.change.input.checked,
          ohlcVisible: readoutControls.ohlc.input.checked,
          volumeVisible: readoutControls.volume.input.checked,
        },
      }));
    } catch (error) {
      outcome = Object.freeze({ accepted: false, message: error?.message });
    }
    if (outcome?.accepted === true) {
      if (touchedColors.length > 0) {
        try {
          onRecordRecentColors(touchedColors.map((name) => pickerByName.get(name).value));
        } catch { /* A convenience history failure cannot roll back accepted Settings. */ }
      }
      closePickers();
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
    dispose() {
      for (const picker of pickerControls) picker.dispose();
      dialog.remove();
    },
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
      (activeTab === 'canvas'
        ? grid
        : activeTab === 'symbol'
          ? candleControls.body.visible
          : activeTab === 'status'
            ? readoutControls.ohlc.input
            : currentPriceControls.name.input).focus();
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
