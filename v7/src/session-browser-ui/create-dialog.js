import { element, icon } from './dom-primitives.js';

function toLocalDateTime(epochMs) {
  const date = new Date(epochMs - new Date(epochMs).getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
}

function field(label, control, hint = null) {
  const labelNode = element('label', { className: 'form-field' }, [
    element('span', { className: 'form-label', text: label }),
    control,
  ]);
  if (hint) labelNode.append(element('span', { className: 'form-hint', text: hint }));
  return labelNode;
}

function createControls(instruments, defaultRange) {
  const name = element('input', {
    className: 'text-input', name: 'name', type: 'text', maxlength: '120',
    autocomplete: 'off', placeholder: 'e.g. London open practice', required: '',
  });
  const start = element('input', {
    className: 'text-input', name: 'start', type: 'datetime-local',
    value: toLocalDateTime(defaultRange.startEpochMs), required: '',
  });
  const end = element('input', {
    className: 'text-input', name: 'end', type: 'datetime-local',
    value: toLocalDateTime(defaultRange.endEpochMs), required: '',
  });
  const instrumentsGrid = element('div', { className: 'instrument-grid', role: 'group', 'aria-label': 'Instruments' });
  instruments.forEach((instrument, index) => {
    const input = element('input', {
      type: 'checkbox', name: 'instrument', value: instrument.id,
      id: `instrument-${index}`, ...(index === 0 ? { checked: '' } : {}),
    });
    instrumentsGrid.append(element('label', { className: 'instrument-option', for: `instrument-${index}` }, [
      input,
      element('span', { className: 'instrument-symbol', text: instrument.label }),
      element('span', { className: 'instrument-market', text: instrument.market }),
    ]));
  });
  return Object.freeze({ name, start, end, instrumentsGrid });
}

function readIntent(form, controls) {
  const instrumentIds = [...form.querySelectorAll('input[name="instrument"]:checked')].map((input) => input.value);
  const startEpochMs = new Date(controls.start.value).getTime();
  const endEpochMs = new Date(controls.end.value).getTime();
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
 * Inputs: instrument options, default range, submit and cancel callbacks.
 * Outputs: dialog element with open/close/focus API.
 * Side effects: creates DOM and binds listeners scoped to the returned dialog.
 * Errors: form validation is reported inline; submit callback errors stay external.
 */
export function createSessionDialog({ instruments, defaultRange, onSubmit }) {
  const dialog = element('dialog', { className: 'create-dialog', 'aria-labelledby': 'create-title' });
  const controls = createControls(instruments, defaultRange);
  const error = element('div', { className: 'form-error', role: 'alert', hidden: '' });
  const form = element('form', { className: 'create-form', method: 'dialog' });
  form.append(
    field('Session name', controls.name, 'Use a name you will recognize later.'),
    field('Instruments', controls.instrumentsGrid),
    element('div', { className: 'date-grid' }, [
      field('Start', controls.start),
      field('End', controls.end),
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
    const result = readIntent(form, controls);
    if (result.error) {
      error.textContent = result.error;
      error.hidden = false;
      return;
    }
    onSubmit(result.intent);
  });

  return Object.freeze({
    element: dialog,
    open() {
      error.hidden = true;
      dialog.showModal();
      controls.name.focus();
    },
    close() {
      dialog.close();
    },
  });
}
