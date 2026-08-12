import { createColorPickerControl } from './color-picker-control.js';
import {
  candleStyleControl,
  element,
  fieldControl,
  numberControl,
  selectControl,
  switchControl,
} from './settings-dialog-primitives.js';

const BASE_TABS = Object.freeze([
  Object.freeze({ id: 'symbol', label: 'Symbol' }),
  Object.freeze({ id: 'status', label: 'Status line' }),
  Object.freeze({ id: 'scales', label: 'Scales and lines' }),
  Object.freeze({ id: 'canvas', label: 'Canvas' }),
]);

function createCandleControls(pickerOptions) {
  return Object.freeze({
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
}

function createCanvasPickers({ getRecentColors, onColorChange, onPickerOpen }) {
  const pickers = {};
  pickers.background = createColorPickerControl({
    getRecentColors, label: 'Canvas background color', name: 'canvasBackgroundColor',
    onChange: () => onColorChange('canvasBackgroundColor'),
    onOpen: () => onPickerOpen(pickers.background),
  });
  pickers.crosshair = createColorPickerControl({
    getRecentColors, label: 'Crosshair color and opacity', name: 'crosshairColorAndOpacity',
    onChange: () => onColorChange('crosshairColorAndOpacity'),
    onOpen: () => onPickerOpen(pickers.crosshair),
  });
  pickers.scaleText = createColorPickerControl({
    getRecentColors, label: 'Scale text color', name: 'scaleTextColor',
    onChange: () => onColorChange('scaleTextColor'),
    onOpen: () => onPickerOpen(pickers.scaleText),
  });
  return Object.freeze(pickers);
}

function createPrecisionControl() {
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
  return precision;
}

function createPresentationControls() {
  const crosshairStyle = selectControl({
    label: 'Line style', name: 'crosshairStyle', options: [
      { label: 'Solid', value: 'solid' }, { label: 'Dashed', value: 'dashed' },
      { label: 'Dotted', value: 'dotted' },
    ],
  });
  const crosshairWidth = selectControl({
    label: 'Line thickness', name: 'crosshairWidth',
    options: [1, 2, 3, 4].map((value) => ({ label: `${value} px`, value })),
  });
  const scaleFontSize = selectControl({
    label: 'Scale font size', name: 'scaleFontSize',
    options: [8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 22, 24]
      .map((value) => ({ label: `${value} px`, value })),
  });
  const paneControls = selectControl({
    copy: 'Controls remain available through each Pane without changing chart state.',
    label: 'Navigation controls', name: 'paneControlDockVisibility',
    options: [
      { label: 'Visible on mouse over', value: 'hover' },
      { label: 'Always visible', value: 'always' },
      { label: 'Always hidden', value: 'hidden' },
    ],
  });
  return Object.freeze({ crosshairStyle, crosshairWidth, paneControls, scaleFontSize });
}

function createTimeControls() {
  return Object.freeze({
    dateFormat: selectControl({
      copy: 'Examples use the same date in each supported format.', label: 'Date format', name: 'dateFormat',
      options: [
        { label: 'YYYY-MM-DD · 2026-05-01', value: 'YYYY-MM-DD' },
        { label: 'YYYY/MM/DD · 2026/05/01', value: 'YYYY/MM/DD' },
        { label: 'DD/MM/YYYY · 01/05/2026', value: 'DD/MM/YYYY' },
        { label: 'MM/DD/YYYY · 05/01/2026', value: 'MM/DD/YYYY' },
      ],
    }),
    dayOfWeek: switchControl({
      copy: 'Prefix detailed chart and calendar labels with the weekday.',
      label: 'Day of week', name: 'dayOfWeekVisible',
    }),
    hourFormat: selectControl({
      label: 'Time format', name: 'hourFormat', options: [
        { label: '24-hour · 13:45', value: '24-hour' },
        { label: '12-hour · 1:45 PM', value: '12-hour' },
      ],
    }),
    timezone: selectControl({
      copy: 'Presentation only. Replay and Session instants never move.',
      label: 'Display timezone', name: 'displayTimezone', options: [
        { label: 'New York', value: 'America/New_York' },
        { label: 'UTC', value: 'UTC' }, { label: 'Browser local', value: 'local' },
      ],
    }),
  });
}

function createMargins() {
  return Object.freeze({
    bottom: numberControl({ label: 'Bottom', maximum: 50, minimum: 0, name: 'bottomMarginPercent', suffix: '%' }),
    right: numberControl({
      copy: 'Used for new Panes and the next Reset View; manual walls are preserved.',
      label: 'Right', maximum: 100, minimum: 0, name: 'rightMarginBars', suffix: 'bars',
    }),
    top: numberControl({ label: 'Top', maximum: 50, minimum: 0, name: 'topMarginPercent', suffix: '%' }),
  });
}

function createPanels(controls, pluginCenter) {
  const panels = new Map([
    ['symbol', element('section', { className: 'workstation-settings-symbol' }, [
      element('span', { className: 'workstation-settings-kicker', text: 'Candles' }),
      controls.candles.body.root, controls.candles.borders.root, controls.candles.wicks.root,
      element('div', { className: 'workstation-settings-precision-row' }, [
        element('span', { className: 'workstation-settings-row-copy' }, [
          element('strong', { text: 'Precision' }),
          element('small', { text: 'Auto follows each pane instrument tick size.' }),
        ]),
        controls.precision,
      ]),
    ])],
    ['status', element('section', { className: 'workstation-settings-status' }, [
      element('span', { className: 'workstation-settings-kicker', text: 'Content' }),
      controls.readout.ohlc.root, controls.readout.change.root, controls.readout.volume.root,
      element('span', { className: 'workstation-settings-kicker workstation-settings-section-kicker',
        text: 'Typography' }),
      controls.readout.fontSize.root,
    ])],
    ['scales', element('section', { className: 'workstation-settings-scales' }, [
      element('span', { className: 'workstation-settings-kicker', text: 'Current price' }),
      controls.currentPrice.name.root, controls.currentPrice.value.root, controls.currentPrice.line.root,
      element('p', { className: 'workstation-settings-panel-note',
        text: 'Name, value, and line are independent on every pane.' }),
      element('span', { className: 'workstation-settings-kicker workstation-settings-section-kicker',
        text: 'Time scale' }),
      controls.time.timezone.root, controls.time.dateFormat.root,
      controls.time.dayOfWeek.root, controls.time.hourFormat.root,
    ])],
    ['canvas', createCanvasPanel(controls)],
  ]);
  if (pluginCenter) panels.set('core-plugins', pluginCenter.root);
  return panels;
}

function createCanvasPanel(controls) {
  const kicker = (text) => element('span', {
    className: 'workstation-settings-kicker workstation-settings-section-kicker', text,
  });
  return element('section', { className: 'workstation-settings-canvas' }, [
    element('span', { className: 'workstation-settings-kicker', text: 'Chart basic styles' }),
    fieldControl({ control: controls.canvasPickers.background.root, label: 'Background' }),
    controls.gridControl.root,
    kicker('Crosshair'),
    fieldControl({ control: controls.canvasPickers.crosshair.root,
      copy: 'Opacity is adjusted inside the color picker.', label: 'Color' }),
    controls.crosshairWidth.root, controls.crosshairStyle.root,
    kicker('Scales'),
    fieldControl({ control: controls.canvasPickers.scaleText.root, label: 'Text color' }),
    controls.scaleFontSize.root,
    kicker('Buttons'), controls.paneControls.root,
    kicker('Margins'), controls.margins.top.root, controls.margins.bottom.root, controls.margins.right.root,
  ]);
}

function createDialogShell(panels, tabsConfiguration) {
  const tabs = new Map();
  let activeTab = 'symbol';
  let selectionObserver = () => {};
  const tabRail = element('nav', { className: 'workstation-settings-tabs' });
  tabRail.setAttribute('aria-label', 'Settings categories');
  tabRail.setAttribute('role', 'tablist');
  const panelHost = element('div', { className: 'workstation-settings-panel' });
  const selectTab = (id) => {
    if (!tabs.has(id)) return;
    activeTab = id;
    for (const [tabId, button] of tabs) {
      const active = tabId === id;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      panels.get(tabId).hidden = !active;
    }
    selectionObserver(id);
  };
  for (const tab of tabsConfiguration) {
    const button = element('button', { className: 'workstation-settings-tab', text: tab.label, type: 'button' });
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
  return Object.freeze({
    activeTab: () => activeTab,
    panelHost,
    selectTab,
    setSelectionObserver(observer) { selectionObserver = observer; },
    tabRail,
  });
}

function createDialogFrame(shell) {
  const validation = element('p', { className: 'workstation-settings-validation' });
  validation.hidden = true;
  const recovery = element('p', { className: 'workstation-settings-recovery' });
  recovery.hidden = true;
  const reset = element('button', { className: 'button workstation-settings-reset', text: 'Reset', type: 'button' });
  const cancel = element('button', { className: 'button workstation-settings-cancel', text: 'Cancel', type: 'button' });
  const save = element('button', { className: 'button workstation-settings-save', text: 'OK', type: 'button' });
  const close = element('button', { className: 'workstation-settings-close', text: '×', type: 'button' });
  close.setAttribute('aria-label', 'Close Settings');
  const content = element('div', { className: 'workstation-settings-dialog-content' }, [
    element('header', { className: 'workstation-settings-header' }, [element('h2', { text: 'Settings' }), close]),
    element('div', { className: 'workstation-settings-body' }, [shell.tabRail, shell.panelHost]),
    recovery, validation,
    element('footer', { className: 'workstation-settings-footer' }, [
      reset, element('div', { className: 'workstation-settings-footer-actions' }, [cancel, save]),
    ]),
  ]);
  const dialog = element('dialog', { className: 'workstation-settings-dialog' }, [content]);
  dialog.setAttribute('aria-labelledby', 'workstation-settings-title');
  content.querySelector('h2').id = 'workstation-settings-title';
  const footer = content.querySelector('.workstation-settings-footer');
  return Object.freeze({ cancel, close, dialog, footer, recovery, reset, save, validation });
}

export function createSettingsDialogForm({ getRecentColors, onColorChange, pluginCenter = null }) {
  const pickerControls = [];
  const closePickers = (except = null) => {
    for (const picker of pickerControls) if (picker !== except) picker.close();
  };
  const pickerOptions = { getRecentColors, onColorChange, onPickerOpen: (picker) => closePickers(picker) };
  const candles = createCandleControls(pickerOptions);
  for (const group of Object.values(candles)) pickerControls.push(group.up, group.down);
  const canvasPickers = createCanvasPickers(pickerOptions);
  pickerControls.push(canvasPickers.background, canvasPickers.crosshair, canvasPickers.scaleText);
  const presentation = createPresentationControls();
  const controls = {
    candles,
    canvasPickers,
    currentPrice: Object.freeze({
      line: switchControl({ label: 'Price line', name: 'currentPriceLineVisible' }),
      name: switchControl({ label: 'Symbol name', name: 'currentPriceNameVisible' }),
      value: switchControl({ label: 'Price value', name: 'currentPriceValueVisible' }),
    }),
    gridControl: switchControl({
      copy: 'Show horizontal and vertical chart guides.', label: 'Grid lines', name: 'gridVisible',
    }),
    margins: createMargins(),
    precision: createPrecisionControl(),
    readout: Object.freeze({
      change: switchControl({ label: 'Bar change values', name: 'changeVisible' }),
      fontSize: selectControl({
        label: 'Font size', name: 'paneReadoutFontSize',
        options: [10, 11, 12, 13, 14, 15, 16, 17, 18]
          .map((value) => ({ label: `${value} px`, value })),
      }),
      ohlc: switchControl({ label: 'Chart values (OHLC)', name: 'ohlcVisible' }),
      volume: switchControl({ copy: 'Unavailable source volume is shown as Vol —.', label: 'Volume', name: 'volumeVisible' }),
    }),
    time: createTimeControls(),
    ...presentation,
  };
  controls.grid = controls.gridControl.input;
  const panels = createPanels(controls, pluginCenter);
  const tabs = pluginCenter === null ? BASE_TABS : Object.freeze([
    ...BASE_TABS,
    Object.freeze({ id: 'core-plugins', label: 'Plugins' }),
  ]);
  const shell = createDialogShell(panels, tabs);
  const frame = createDialogFrame(shell);
  shell.setSelectionObserver((id) => {
    frame.dialog.dataset.settingsDestination = id;
    frame.footer.hidden = id === 'core-plugins';
  });
  return Object.freeze({
    ...controls,
    ...frame,
    activeTab: shell.activeTab,
    closePickers,
    disposePickers() { for (const picker of pickerControls) picker.dispose(); },
    focusTab(id) {
      if (id === 'core-plugins') pluginCenter.focus();
      else if (id === 'canvas') canvasPickers.background.focus();
      else (id === 'symbol' ? candles.body.visible
        : id === 'status' ? controls.readout.ohlc.input : controls.currentPrice.name.input).focus();
    },
    pickerByName: new Map(pickerControls.map((picker) => [picker.input.name, picker])),
    selectTab(id) {
      closePickers();
      shell.selectTab(id);
    },
  });
}
