import { createCaptureCaseForm } from './capture-case-form.js';
import { createPendingOutcomesView } from './capture-outcome-view.js';
import { button, element } from './dom.js';

function emptyCaptureView(close, onCampaignIntent) {
  return element('section', { className: 'validation-empty-inline' }, [
    element('header', {}, [
      element('h2', { text: 'Capture Study Case' }),
      element('p', {
        text: 'Study Cases must belong to an active Validation Campaign.',
      }),
    ]),
    element('div', { className: 'validation-row-actions' }, [
      button('Go to Validation', () => {
        close();
        return onCampaignIntent();
      }, 'validation-button validation-button-primary'),
      button('Close', close, 'validation-button validation-button-ghost'),
    ]),
  ]);
}

/** Own the bounded capture/outcome dialog mounted outside chart DOM. */
export function createCaptureDialog({ onCampaignIntent, onError, readCaptureContext, runtime }) {
  let active = false;
  let returnFocus = null;
  const dialog = element('dialog', { className: 'validation-dialog validation-capture-dialog' });
  const body = element('div');
  const error = element('p', { className: 'validation-dialog-error', role: 'alert' });
  dialog.append(body);
  document.body.append(dialog);

  function close() {
    if (!active) return;
    active = false;
    dialog.close();
    returnFocus?.focus();
    returnFocus = null;
  }

  dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });

  function setError(cause) {
    const message = cause?.message ?? 'Validation Campaign action failed.';
    error.textContent = message;
    onError?.(message);
  }

  function renderCapture(campaignId = null) {
    error.textContent = '';
    const context = readCaptureContext();
    const campaigns = runtime.listCampaigns().filter(({ status }) => status === 'active');
    const selectedId = campaignId ?? campaigns[0]?.campaignId;
    if (!selectedId) {
      body.replaceChildren(emptyCaptureView(close, onCampaignIntent));
      return;
    }
    const documentValue = runtime.getCampaign(selectedId);
    const campaign = documentValue.campaign;
    const form = createCaptureCaseForm({
      campaign,
      campaigns,
      context,
      error,
      onCampaignChange: renderCapture,
      onError: setError,
      onRecorded: close,
      runtime,
    });
    body.replaceChildren(
      element('header', { className: 'validation-dialog-header' }, [
        element('div', {}, [
          element('span', { className: 'validation-eyebrow', text: 'Decision-time evidence' }),
          element('h2', { text: 'Capture Study Case' }),
        ]),
        button('Close', close, 'validation-button validation-button-ghost'),
      ]),
      form,
    );
  }

  function renderOutcome() {
    error.textContent = '';
    const context = readCaptureContext();
    const list = createPendingOutcomesView({
      context,
      onError: setError,
      onRefresh: renderOutcome,
      runtime,
    });
    body.replaceChildren(
      element('header', { className: 'validation-dialog-header' }, [
        element('div', {}, [
          element('span', { className: 'validation-eyebrow', text: 'Later path observation' }),
          element('h2', { text: 'Pending Outcomes' }),
        ]),
        button('Close', close, 'validation-button validation-button-ghost'),
      ]),
      list, error,
    );
  }

  return Object.freeze({
    dispose() { if (active) close(); dialog.remove(); },
    openCapture(trigger, campaignId = null) {
      returnFocus = trigger;
      active = true;
      try { renderCapture(campaignId); dialog.showModal(); } catch (cause) { setError(cause); }
    },
    openOutcomes(trigger) {
      returnFocus = trigger;
      active = true;
      try { renderOutcome(); dialog.showModal(); } catch (cause) { setError(cause); }
    },
  });
}
