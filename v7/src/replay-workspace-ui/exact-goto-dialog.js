import { createDateTimeControl } from '../calendar-surface/public.js';
import { createTimePresentation, readWorkstationSettings } from '../workstation-settings/public.js';
import { setControlDisabled, setControlsDisabled } from './control-availability.js';

function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  for (const child of children) if (child) node.append(child);
  return node;
}

function requireRange(range) {
  const startEpochMs = range?.startEpochMs;
  const endEpochMs = range?.endEpochMs;
  if (!Number.isSafeInteger(startEpochMs) || startEpochMs < 0
    || !Number.isSafeInteger(endEpochMs) || endEpochMs < startEpochMs) {
    throw new TypeError('Exact GoTo requires one ordered Replay Session range.');
  }
  return Object.freeze({ endEpochMs, startEpochMs });
}

/** Own the separate Workspace-level Exact GoTo trigger and range-aware dialog. */
export function createExactGotoDialog({ getDefaultEpochMs, onSubmit, replayRange, workstationSettings }) {
  const range = requireRange(replayRange);
  readWorkstationSettings(workstationSettings);
  let activeSettings = workstationSettings;
  let presentation = createTimePresentation(activeSettings);
  let rangeText = '';
  const toggle = element('button', {
    className: 'button replay-action-button exact-goto-toggle', text: 'Exact', type: 'button',
  });
  toggle.setAttribute('aria-label', 'Go to exact date and time');
  const dateTimeHost = element('div', { className: 'exact-goto-date-time-host' });
  let dateTime = null;
  const validation = element('p', { className: 'goto-validation exact-goto-validation' });
  validation.hidden = true;
  const title = element('h2', { text: 'Go to date & time' });
  title.id = 'replay-exact-goto-title';
  const instruction = element('p');
  const rangeCopy = element('p', { className: 'exact-goto-range' });
  const close = element('button', { className: 'goto-dialog-close', text: '×', type: 'button' });
  close.setAttribute('aria-label', 'Close exact Go to');
  const dialog = element('dialog', { className: 'goto-dialog exact-goto-dialog' }, [
    element('header', { className: 'goto-dialog-header' }, [
      element('div', {}, [
        title,
        instruction,
      ]),
      close,
    ]),
    element('div', { className: 'goto-dialog-body' }, [
      rangeCopy,
      dateTimeHost,
      validation,
    ]),
    element('footer', { className: 'goto-dialog-actions' }, [
      element('button', { className: 'button goto-cancel', text: 'Cancel', type: 'button' }),
      element('button', { className: 'button goto-submit', text: 'Go to', type: 'button' }),
    ]),
  ]);
  dialog.setAttribute('aria-labelledby', title.id);

  function replaceDateTime(settings, preserveEpochMs = null) {
    readWorkstationSettings(settings);
    activeSettings = settings;
    presentation = createTimePresentation(activeSettings);
    const selectedEpochMs = Number.isSafeInteger(preserveEpochMs)
      ? preserveEpochMs
      : dateTime?.readEpochMs();
    dateTime?.close();
    dateTime = createDateTimeControl({
      dateTimePresentation: presentation.calendarPresentation,
      label: 'Replay target',
      maxEpochMs: range.endEpochMs,
      minEpochMs: range.startEpochMs,
      name: 'goto-target',
      presentation: 'inline',
      timeZone: presentation.timeZone,
    });
    dateTimeHost.replaceChildren(dateTime.element);
    if (Number.isSafeInteger(selectedEpochMs)) dateTime.setEpochMs(selectedEpochMs);
    rangeText = `${presentation.formatDateTime(range.startEpochMs, { timeZoneName: false })} – `
      + `${presentation.formatDateTime(range.endEpochMs, { timeZoneName: false })}`
      + ` · ${presentation.timeZoneLabel}`;
    rangeCopy.textContent = `Replay Session · ${rangeText}`;
    instruction.textContent = `Choose an exact date and time in ${presentation.timeZoneLabel}.`;
    dialog.dataset.displayTimezone = presentation.timeZone;
  }

  replaceDateTime(activeSettings);

  function closeDialog() {
    dateTime.close();
    if (dialog.open) dialog.close();
  }

  function open(epochMs = getDefaultEpochMs()) {
    if (Number.isSafeInteger(epochMs)) dateTime.setEpochMs(epochMs);
    validation.hidden = true;
    dateTime.open();
    dialog.showModal();
  }

  function submit() {
    const epochMs = dateTime.readEpochMs();
    if (!Number.isSafeInteger(epochMs)) {
      validation.textContent = `Choose a valid date and time in ${presentation.timeZoneLabel}.`;
      validation.hidden = false;
      return;
    }
    if (epochMs < range.startEpochMs || epochMs > range.endEpochMs) {
      validation.textContent = `Time must be between ${rangeText}.`;
      validation.hidden = false;
      return;
    }
    validation.hidden = true;
    closeDialog();
    onSubmit(epochMs);
  }

  toggle.addEventListener('click', () => open());
  close.addEventListener('click', closeDialog);
  dialog.querySelector('.goto-cancel').addEventListener('click', closeDialog);
  dialog.querySelector('.goto-submit').addEventListener('click', submit);
  document.body.append(dialog);

  return Object.freeze({
    dialog,
    dispose() {
      closeDialog();
      dialog.remove();
      toggle.remove();
    },
    open,
    root: toggle,
    setWorkstationSettings(settings) {
      const selected = dateTime.readEpochMs();
      replaceDateTime(settings, selected);
    },
    setDisabled(disabled, preserveVisual = false) {
      const options = { disabled, preserveVisual };
      setControlDisabled(toggle, options);
      setControlsDisabled(dialog.querySelectorAll('button'), options);
    },
  });
}
