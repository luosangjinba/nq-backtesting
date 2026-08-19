import {
  captureSourceOptions,
  createCaptureEvidencePreview,
} from './capture-evidence-view.js';
import { button, element, field } from './dom.js';

function input(name, value = '', type = 'text') {
  return element('input', { name, type, value });
}

function option(value, label = value) { return element('option', { value, text: label }); }

function select(name, values) {
  return element('select', { name }, values.map(({ label, value }) => option(value, label)));
}

function captureControls(campaign, sources) {
  const controls = {
    authorLabel: input('authorLabel', campaign.authorLabel),
    classificationReason: element('textarea', { name: 'classificationReason', rows: 2 }),
    confidence: input('confidence', '80', 'number'),
    contextPaneId: select('contextPaneId', sources.contextPanes.map(({ paneId }) => ({
      label: paneId, value: paneId,
    }))),
    executionPaneId: select('executionPaneId', sources.executionPanes.map(({ paneId }) => ({
      label: paneId, value: paneId,
    }))),
    explicitConfirmation: input('explicitConfirmation', 'confirmed', 'checkbox'),
    fvgArtifactId: select('fvgArtifactId', sources.fvg),
    horizonBars: input('horizonBars', '20', 'number'),
    invalidationPrice: input('invalidationPrice', '', 'number'),
    notes: element('textarea', { name: 'notes', rows: 3 }),
    qualificationClass: select('qualificationClass', [
      { label: 'Qualified', value: 'qualified' },
      { label: 'Rejected', value: 'rejected' },
      { label: 'Ambiguous', value: 'ambiguous' },
      { label: 'Incomplete', value: 'incomplete' },
    ]),
    referencePrice: input('referencePrice', '', 'number'),
    smaInstanceId: select('smaInstanceId', sources.sma),
    targetPrice: input('targetPrice', '', 'number'),
  };
  controls.contextPaneId.value = sources.sma[0]?.paneId ?? sources.contextPanes[0]?.paneId ?? '';
  return controls;
}

function classificationFields(controls) {
  const confirmation = field(
    'Qualified confirmation',
    controls.explicitConfirmation,
    'I reviewed both frozen predicates and intentionally classify this Case as qualified.',
  );
  confirmation.classList.add('validation-checkbox-field');
  const reason = field('Incomplete reason', controls.classificationReason);
  const update = () => {
    const classification = controls.qualificationClass.value;
    confirmation.hidden = classification !== 'qualified';
    reason.hidden = classification !== 'incomplete';
  };
  controls.qualificationClass.addEventListener('change', update);
  update();
  return Object.freeze({ confirmation, reason, update });
}

function observationRequest(owner) {
  const { campaign, controls, runtime } = owner;
  return {
    campaignId: campaign.campaignId,
    contextPaneId: controls.contextPaneId.value,
    executionPaneId: controls.executionPaneId.value,
    expectedDocumentRevision: runtime.getCampaign(campaign.campaignId).documentRevision,
    fvgArtifactId: controls.fvgArtifactId.value,
    outcomeDefinitionRef: campaign.outcomeDefinitionRef,
    smaInstanceId: controls.smaInstanceId.value,
    setupDefinitionRef: campaign.setupDefinitionRef,
  };
}

function caseCommand(owner) {
  const { campaign, controls, preview, runtime } = owner;
  const classification = controls.qualificationClass.value;
  return {
    authorLabel: controls.authorLabel.value,
    campaignId: campaign.campaignId,
    ...(classification === 'incomplete' ? {
      classificationReason: controls.classificationReason.value,
    } : { explicitConfirmation: controls.explicitConfirmation.checked }),
    confidence: controls.confidence.value === '' ? null : Number(controls.confidence.value),
    expectedDocumentRevision: runtime.getCampaign(campaign.campaignId).documentRevision,
    kind: classification === 'incomplete' ? 'save-incomplete-case' : 'commit-case-observation',
    notes: controls.notes.value,
    outcomeDefinitionRef: campaign.outcomeDefinitionRef,
    pathPlan: {
      direction: campaign.direction,
      horizonBars: Number(controls.horizonBars.value),
      invalidationPrice: Number(controls.invalidationPrice.value),
      referencePrice: Number(controls.referencePrice.value),
      targetPrice: Number(controls.targetPrice.value),
    },
    previewToken: preview.previewToken,
    qualificationClass: classification,
    setupDefinitionRef: campaign.setupDefinitionRef,
  };
}

function setSourceLease(owner, locked) {
  for (const control of owner.sourceControls) control.disabled = locked;
  owner.prepare.disabled = locked;
  owner.changeSources.disabled = !locked;
}

async function reviewEvidence(owner) {
  owner.error.textContent = '';
  try {
    owner.preview = await owner.runtime.prepareCaseObservation(observationRequest(owner));
    owner.form.querySelector('.validation-preview')?.remove();
    owner.form.insertBefore(createCaptureEvidencePreview(owner.preview), owner.actions);
    if (owner.preview.sharedContext === null) {
      owner.controls.qualificationClass.value = 'incomplete';
      owner.classification.update();
    }
    setSourceLease(owner, true);
    owner.commit.disabled = false;
  } catch (cause) { owner.onError(cause); }
}

async function recordCase(owner) {
  if (!owner.preview) return;
  owner.error.textContent = '';
  const classification = owner.controls.qualificationClass.value;
  try {
    if (owner.preview.sharedContext === null && classification !== 'incomplete') {
      throw new TypeError('Unavailable evidence can only be saved as an incomplete draft.');
    }
    if (classification === 'qualified' && !owner.controls.explicitConfirmation.checked) {
      throw new TypeError('Confirm the reviewed predicates before recording a qualified Case.');
    }
    await owner.runtime.execute(caseCommand(owner));
    owner.onRecorded();
  } catch (cause) { owner.onError(cause); }
}

function captureActions(owner) {
  owner.prepare = button('Review evidence', () => reviewEvidence(owner),
    'validation-button validation-button-secondary');
  owner.changeSources = button('Change sources', () => {
    owner.preview = null;
    owner.form.querySelector('.validation-preview')?.remove();
    owner.commit.disabled = true;
    setSourceLease(owner, false);
  }, 'validation-button validation-button-secondary');
  owner.commit = button('Record Study Case', () => recordCase(owner),
    'validation-button validation-button-primary');
  owner.changeSources.disabled = true;
  owner.commit.disabled = true;
  return element('footer', { className: 'validation-dialog-actions' }, [
    button('Cancel', owner.onRecorded, 'validation-button validation-button-ghost'),
    owner.changeSources,
    owner.prepare,
    owner.commit,
  ]);
}

function appendFields(owner, campaignSelect) {
  const { classification, controls, error, form } = owner;
  form.append(
    field('Campaign', campaignSelect),
    element('div', { className: 'validation-form-grid' }, [
      field('Context Pane', controls.contextPaneId),
      field('SMA(close,20) instance', controls.smaInstanceId),
      field('Execution Pane', controls.executionPaneId),
      field('Manual FVG', controls.fvgArtifactId),
    ]),
    element('h3', { text: 'Ex-ante path plan' }),
    element('div', { className: 'validation-form-grid validation-form-grid-four' }, [
      field('Reference', controls.referencePrice),
      field('Invalidation', controls.invalidationPrice),
      field('Target', controls.targetPrice),
      field('Horizon Bars', controls.horizonBars),
    ]),
    element('div', { className: 'validation-form-grid' }, [
      field('Classification', controls.qualificationClass),
      field('Confidence 0–100', controls.confidence),
      field('Author', controls.authorLabel),
    ]),
    classification.confirmation,
    classification.reason,
    field('Notes', controls.notes),
    error,
    owner.actions,
  );
}

/** Own the bounded capture form and its explicit evidence-review lease. */
export function createCaptureCaseForm({
  campaign, campaigns, context, error, onCampaignChange, onError, onRecorded, runtime,
}) {
  const sources = captureSourceOptions(context, campaign);
  const form = element('form', { className: 'validation-form' });
  const campaignSelect = select('campaignId', campaigns.map((entry) => ({
    label: `${entry.title} · ${entry.direction}`, value: entry.campaignId,
  })));
  campaignSelect.value = campaign.campaignId;
  campaignSelect.addEventListener('change', () => onCampaignChange(campaignSelect.value));
  const controls = captureControls(campaign, sources);
  const owner = {
    actions: null,
    campaign,
    changeSources: null,
    classification: classificationFields(controls),
    commit: null,
    controls,
    error,
    form,
    onError,
    onRecorded,
    prepare: null,
    preview: null,
    runtime,
    sourceControls: [
      campaignSelect, controls.contextPaneId, controls.executionPaneId,
      controls.fvgArtifactId, controls.smaInstanceId,
    ],
  };
  owner.actions = captureActions(owner);
  appendFields(owner, campaignSelect);
  return form;
}
