import { uiElement } from './ui-elements.js';

function valueFromControl(input, control) {
  if (control.kind === 'boolean') return input.checked;
  if (control.kind === 'number') return Number(input.value);
  return input.value;
}

function setControlValue(input, control, value) {
  if (control.kind === 'boolean') input.checked = value === true;
  else input.value = String(value);
}

function validationMessage(value, control) {
  if (control.kind === 'color' && !/^#[A-Fa-f0-9]{8}$/u.test(value)) {
    return 'Use #RRGGBBAA.';
  }
  if (control.kind === 'number') {
    if (!Number.isFinite(value)) return 'Enter a number.';
    if (value < control.min || value > control.max) {
      return `Use a value from ${control.min} to ${control.max}.`;
    }
    if (Number.isFinite(control.step)
      && Math.abs((value - control.min) / control.step
        - Math.round((value - control.min) / control.step)) > 1e-9) {
      return `Use increments of ${control.step}.`;
    }
  }
  return null;
}

/** Render one P0a host-schema field without importing package code. */
export function createCalculatedSeriesFieldControl({
  effectiveValue,
  field,
  onChange,
  onReset,
  overrideValue,
  resetSource,
  source,
}) {
  const input = field.control.kind === 'select'
    ? uiElement('select', { ariaLabel: field.label })
    : uiElement('input', { ariaLabel: field.label });
  if (field.control.kind === 'number') {
    input.type = 'number';
    input.min = String(field.control.min);
    input.max = String(field.control.max);
    input.step = String(field.control.step);
  } else if (field.control.kind === 'boolean') input.type = 'checkbox';
  else if (field.control.kind === 'color') {
    input.type = 'text';
    input.placeholder = '#RRGGBBAA';
  }
  if (field.control.kind === 'select') {
    for (const option of field.control.options) {
      const optionNode = uiElement('option', { text: option.label });
      optionNode.value = option.value;
      input.append(optionNode);
    }
  }
  setControlValue(input, field.control, overrideValue ?? effectiveValue);
  const error = uiElement('span', { className: 'calculated-series-field-error' });
  error.setAttribute('role', 'alert');
  const reset = uiElement('button', {
    className: 'calculated-series-field-reset', text: 'Reset', type: 'button',
  });
  reset.disabled = overrideValue === undefined;
  const sourceNode = uiElement('span', {
    className: 'calculated-series-field-source', text: `Effective source · ${source}`,
  });
  function validateAndChange() {
    const value = valueFromControl(input, field.control);
    const message = validationMessage(value, field.control);
    error.textContent = message ?? '';
    input.setAttribute('aria-invalid', String(message !== null));
    reset.disabled = false;
    if (message === null) {
      sourceNode.textContent = 'Effective source · instance';
      onChange(field.id, value);
    }
  }
  input.addEventListener('input', validateAndChange);
  input.addEventListener('change', validateAndChange);
  reset.addEventListener('click', () => {
    onReset(field.id);
    reset.disabled = true;
    setControlValue(input, field.control, effectiveValue);
    sourceNode.textContent = `Effective source · ${resetSource}`;
    error.textContent = '';
    input.setAttribute('aria-invalid', 'false');
  });
  const row = uiElement('label', { className: 'calculated-series-field' }, [
    uiElement('span', { className: 'calculated-series-field-label', text: field.label }),
    input,
    uiElement('span', { className: 'calculated-series-field-meta' }, [sourceNode, reset]),
    error,
  ]);
  return Object.freeze({ input, row });
}
