export function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  if (options.ariaLabel) node.setAttribute('aria-label', options.ariaLabel);
  for (const child of children) if (child) node.append(child);
  return node;
}

export function statusBadge(state) {
  const label = state.replaceAll('-', ' ');
  const root = element('span', { className: `core-plugin-badge is-${state}`, text: label });
  root.dataset.pluginState = state;
  return root;
}

export function toggleControl({ checked, label, onChange }) {
  const input = element('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.setAttribute('aria-label', label);
  const track = element('span', { className: 'core-plugin-toggle-track' });
  const root = element('label', { className: 'core-plugin-toggle' }, [input, track]);
  input.addEventListener('change', () => onChange(input.checked));
  return Object.freeze({ input, root });
}

export function parameterControl(field, value) {
  let input;
  if (field.control.kind === 'select') {
    input = element('select', { className: 'core-plugin-parameter-input' });
    for (const option of field.control.options) {
      const node = element('option', { text: option.label });
      node.value = option.value;
      input.append(node);
    }
    input.value = String(value);
  } else {
    input = element('input', { className: 'core-plugin-parameter-input' });
    input.type = field.control.kind === 'boolean' ? 'checkbox'
      : field.control.kind === 'number' ? 'number'
        : field.control.kind === 'color' && String(value).length === 7 ? 'color' : 'text';
    if (field.control.kind === 'boolean') input.checked = value === true;
    else input.value = String(value);
    if (field.control.kind === 'number') {
      input.min = String(field.control.min);
      input.max = String(field.control.max);
      input.step = String(field.control.step);
    }
    if (field.control.kind === 'text') input.maxLength = field.control.maxLength;
  }
  input.dataset.fieldId = field.id;
  input.setAttribute('aria-label', field.label);
  return Object.freeze({
    input,
    read() {
      if (field.control.kind === 'boolean') return input.checked;
      if (field.control.kind === 'number') return input.valueAsNumber;
      return input.value;
    },
  });
}
