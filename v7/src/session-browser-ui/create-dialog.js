import { element, icon } from './dom-primitives.js';
import { createDateTimeControl } from './date-time-control.js';
import { createInstrumentPicker } from './instrument-picker.js';

function field(label, control, hint = null, containerTag = 'label') {
  const labelNode = element(containerTag, { className: 'form-field' }, [
    element('span', { className: 'form-label', text: label }),
    control,
  ]);
  if (hint) labelNode.append(element('span', { className: 'form-hint', text: hint }));
  return labelNode;
}

function createControls(instruments) {
  const name = element('input', {
    className: 'text-input', name: 'name', type: 'text', maxlength: '120',
    autocomplete: 'off', placeholder: 'e.g. London open practice', required: '',
  });
  const start = createDateTimeControl({ name: 'start', label: 'Start' });
  const end = createDateTimeControl({ name: 'end', label: 'End' });
  return Object.freeze({ name, start, end, instruments: createInstrumentPicker(instruments) });
}

function resetControls(controls) {
  controls.name.value = '';
  controls.start.reset();
  controls.end.reset();
  controls.instruments.reset();
}

function readIntent(controls) {
  const instrumentIds = controls.instruments.selectedIds();
  const startEpochMs = controls.start.readEpochMs();
  const endEpochMs = controls.end.readEpochMs();
  if (controls.name.value.trim() !== controls.name.value || controls.name.value.length === 0) {
    return { error: 'Enter a name without leading or trailing spaces.' };
  }
  if (instrumentIds.length === 0) return { error: 'Select at least one instrument.' };
  if (!Number.isFinite(startEpochMs) || !Number.isFinite(endEpochMs) || endEpochMs <= startEpochMs) {
    return { error: 'End time must be later than start time.' };
  }
  return {
    intent: {
      name: controls.name.value,
      instrumentIds,
      historicalRange: { startEpochMs, endEpochMs },
    },
  };
}

/**
 * Owner: session-store UI adapter.
 * Purpose: build the accessible Create Session dialog and normalize its form
 * intent without owning persistence or Session identity.
 * Inputs: instrument options plus submit callback.
 * Outputs: dialog element with open/close/focus API.
 * Side effects: creates DOM and binds listeners scoped to the returned dialog.
 * Errors: form validation is reported inline; submit callback errors stay external.
 */
export function createSessionDialog({ instruments, onSubmit }) {
  const dialog = element('dialog', { className: 'create-dialog', 'aria-labelledby': 'create-title' });
  const controls = createControls(instruments);
  const error = element('div', { className: 'form-error', role: 'alert', hidden: '' });
  const form = element('form', { className: 'create-form', method: 'dialog' });
  form.append(
    field('Session name', controls.name, 'Use a name you will recognize later.'),
    field('Instruments', controls.instruments.element),
    element('div', { className: 'date-grid' }, [
      field('Start', controls.start.element, null, 'div'),
      field('End', controls.end.element, null, 'div'),
    ]),
    error,
    element('div', { className: 'dialog-actions' }, [
      element('button', { className: 'button button-secondary', type: 'button', text: 'Cancel', onClick: () => dialog.close() }),
      element('button', { className: 'button button-primary', type: 'submit' }, [icon('plus'), element('span', { text: 'Create session' })]),
    ]),
  );
  dialog.append(element('div', { className: 'dialog-header' }, [
    element('div', {}, [
      element('span', { className: 'eyebrow', text: 'Replay workspace' }),
      element('h2', { id: 'create-title', text: 'Create session' }),
      element('p', { text: 'Define the market and historical window for this practice session.' }),
    ]),
    element('button', { className: 'icon-button', type: 'button', 'aria-label': 'Close dialog', onClick: () => dialog.close() }, [icon('x')]),
  ]), form);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    error.hidden = true;
    const result = readIntent(controls);
    if (result.error) {
      error.textContent = result.error;
      error.hidden = false;
      return;
    }
    onSubmit(result.intent);
  });
  dialog.addEventListener('click', (event) => {
    const path = event.composedPath();
    if (!path.includes(controls.instruments.element)) controls.instruments.close();
    if (!path.includes(controls.start.element)) controls.start.close();
    if (!path.includes(controls.end.element)) controls.end.close();
  });
  dialog.addEventListener('cancel', (event) => {
    const overlayOpen = controls.instruments.isOpen() || controls.start.isOpen() || controls.end.isOpen();
    if (!overlayOpen) return;
    event.preventDefault();
    controls.instruments.close();
    controls.start.close();
    controls.end.close();
  });

  return Object.freeze({
    element: dialog,
    open() {
      resetControls(controls);
      error.hidden = true;
      dialog.showModal();
      controls.name.focus();
    },
    close() {
      dialog.close();
    },
  });
}
