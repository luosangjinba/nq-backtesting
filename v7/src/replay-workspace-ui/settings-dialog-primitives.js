import { createColorPickerControl } from './color-picker-control.js';

export function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  for (const child of children) if (child) node.append(child);
  return node;
}

export function switchControl({ copy, label, name }) {
  const input = element('input', { type: 'checkbox' });
  input.name = name;
  input.setAttribute('aria-label', label);
  const root = element('label', { className: 'workstation-settings-row' }, [
    element('span', { className: 'workstation-settings-row-copy' }, [
      element('strong', { text: label }), copy ? element('small', { text: copy }) : null,
    ]),
    element('span', { className: 'workstation-settings-switch' }, [
      input, element('span', { className: 'workstation-settings-switch-track' }),
    ]),
  ]);
  return Object.freeze({ input, root });
}

export function fieldControl({ control, copy, label }) {
  return element('label', { className: 'workstation-settings-field-row' }, [
    element('span', { className: 'workstation-settings-row-copy' }, [
      element('strong', { text: label }), copy ? element('small', { text: copy }) : null,
    ]),
    control,
  ]);
}

export function selectControl({ copy, label, name, options }) {
  const select = element('select', { className: 'workstation-settings-select' });
  select.name = name;
  select.setAttribute('aria-label', label);
  for (const option of options) {
    const node = element('option', { text: option.label });
    node.value = String(option.value);
    select.append(node);
  }
  return Object.freeze({ root: fieldControl({ control: select, copy, label }), select });
}

export function numberControl({ copy, label, maximum, minimum, name, suffix }) {
  const input = element('input', { className: 'workstation-settings-number', type: 'number' });
  input.name = name;
  input.min = String(minimum);
  input.max = String(maximum);
  input.step = '1';
  input.setAttribute('aria-label', label);
  const control = element('span', { className: 'workstation-settings-number-shell' }, [
    input, element('span', { text: suffix }),
  ]);
  return Object.freeze({ input, root: fieldControl({ control, copy, label }) });
}

export function candleStyleControl({
  downName, getRecentColors, label, onColorChange, onPickerOpen, upName, visibleName,
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
      visible, element('strong', { text: label }),
    ]),
    element('span', { className: 'workstation-settings-color-pair' }, [
      element('label', {}, [element('small', { text: 'Up' }), up.root]),
      element('label', {}, [element('small', { text: 'Down' }), down.root]),
    ]),
  ]);
  return Object.freeze({ down, root, up, visible });
}
