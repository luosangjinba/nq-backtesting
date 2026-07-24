import { element, icon } from './dom-primitives.js';
import { createDateTimeControl } from '../calendar-surface/public.js';
import { createInstrumentPicker } from './instrument-picker.js';
import {
  intersectMarketDates,
  marketDateId,
  sharedMarketTimeBounds,
} from './market-date-policy.js';

function field(label, control, hint = null, containerTag = 'label') {
  const labelNode = element(containerTag, { className: 'form-field' }, [
    element('span', { className: 'form-label', text: label }),
    control,
  ]);
  if (hint) labelNode.append(element('span', { className: 'form-hint', text: hint }));
  return labelNode;
}

function createControls(instruments, onInstrumentSelectionChange) {
  const name = element('input', {
    className: 'text-input', name: 'name', type: 'text', maxlength: '120',
    autocomplete: 'off', placeholder: 'e.g. London open practice', required: '',
  });
  const start = createDateTimeControl({
    disableOutsideMonth: true,
    name: 'start', label: 'Start in New York', timeZone: 'America/New_York',
  });
  const end = createDateTimeControl({
    disableOutsideMonth: true,
    name: 'end', label: 'End in New York', placement: 'end', timeZone: 'America/New_York',
  });
  return Object.freeze({
    name,
    start,
    end,
    instruments: createInstrumentPicker(instruments, { onSelectionChange: onInstrumentSelectionChange }),
  });
}

function resetControls(controls) {
  controls.name.value = '';
  controls.start.reset();
  controls.end.reset();
  controls.instruments.reset();
}

function readIntent(controls, availability) {
  const instrumentIds = controls.instruments.selectedIds();
  const startEpochMs = controls.start.readEpochMs();
  const endEpochMs = controls.end.readEpochMs();
  if (controls.name.value.trim() !== controls.name.value || controls.name.value.length === 0) {
    return { error: 'Enter a name without leading or trailing spaces.' };
  }
  if (instrumentIds.length === 0) return { error: 'Select at least one instrument.' };
  if (availability.status === 'loading') return { error: 'Market-data dates are still loading.' };
  if (availability.status !== 'ready') {
    return { error: 'Market-data dates are unavailable. Check the local data service and reopen this dialog.' };
  }
  const enabledDates = new Set(intersectMarketDates(availability.byInstrument, instrumentIds));
  if (!enabledDates.has(controls.start.value().slice(0, 10))
    || !enabledDates.has(controls.end.value().slice(0, 10))) {
    return { error: 'Choose start and end dates with data for every selected instrument.' };
  }
  const bounds = sharedMarketTimeBounds(availability.byInstrument, instrumentIds);
  const startWallMinute = controls.start.value();
  const endWallMinute = controls.end.value();
  if (startWallMinute < bounds.firstTimestamp) {
    return { error: `Start time must be on or after ${bounds.firstTimestamp.replace('T', ' ')} New York time.` };
  }
  if (endWallMinute > bounds.latestTimestamp) {
    return { error: `End time must be on or before ${bounds.latestTimestamp.replace('T', ' ')} New York time.` };
  }
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
export function createSessionDialog({ dateAvailability, instruments, onSubmit }) {
  if (typeof dateAvailability?.loadAvailableDates !== 'function') {
    throw new TypeError('Create Session dialog requires market date availability.');
  }
  const dialog = element('dialog', { className: 'create-dialog', 'aria-labelledby': 'create-title' });
  const availability = { byInstrument: null, status: 'idle' };
  let requestGeneration = 0;
  let requestController = null;
  let disposed = false;
  let controls;

  function applyDatePolicy() {
    dialog.dataset.dateAvailabilityState = availability.status;
    dialog.setAttribute('aria-busy', availability.status === 'loading' ? 'true' : 'false');
    let enabledDates = Object.freeze([]);
    if (availability.status === 'ready') {
      enabledDates = intersectMarketDates(
        availability.byInstrument,
        controls.instruments.selectedIds(),
      );
    }
    const enabled = new Set(enabledDates);
    const predicate = (parts) => enabled.has(marketDateId(parts));
    controls.start.setDateEnabled(predicate);
    controls.end.setDateEnabled(predicate);
  }

  controls = createControls(instruments, applyDatePolicy);
  const error = element('div', { className: 'form-error', role: 'alert', hidden: '' });
  const form = element('form', { className: 'create-form', method: 'dialog' });
  form.append(
    field('Session name', controls.name, 'Use a name you will recognize later.'),
    field('Instruments', controls.instruments.element),
    element('div', { className: 'date-grid' }, [
      field('Start · New York time', controls.start.element, null, 'div'),
      field('End · New York time', controls.end.element, null, 'div'),
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
    const result = readIntent(controls, availability);
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
      availability.status = 'loading';
      availability.byInstrument = null;
      applyDatePolicy();
      error.hidden = true;
      dialog.showModal();
      controls.name.focus();
      requestController?.abort();
      requestController = new AbortController();
      const generation = ++requestGeneration;
      dateAvailability.loadAvailableDates(
        instruments.map(({ id }) => id),
        { signal: requestController.signal },
      ).then((byInstrument) => {
        if (disposed || generation !== requestGeneration) return;
        availability.byInstrument = byInstrument;
        availability.status = 'ready';
        applyDatePolicy();
      }).catch(() => {
        if (disposed || generation !== requestGeneration) return;
        availability.byInstrument = null;
        availability.status = 'error';
        applyDatePolicy();
        error.textContent = 'Market-data dates are unavailable. Check the local data service and reopen this dialog.';
        error.hidden = false;
      });
    },
    close() {
      dialog.close();
    },
    dispose() {
      disposed = true;
      requestGeneration += 1;
      requestController?.abort();
      requestController = null;
      dialog.remove();
    },
  });
}
