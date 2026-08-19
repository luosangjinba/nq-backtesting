import { button, element, field, statusBadge } from './dom.js';

function input(name, value = '', type = 'text') {
  return element('input', { name, type, value });
}

function option(value, label = value) { return element('option', { value, text: label }); }

function select(name, values) {
  return element('select', { name }, values.map(({ label, value }) => option(value, label)));
}

function latestCases(document) {
  const byId = new Map();
  for (const record of document.caseRevisions) {
    const current = byId.get(record.caseId);
    if (!current || current.caseRevision < record.caseRevision) byId.set(record.caseId, record);
  }
  return [...byId.values()];
}

function sourceOptions(context, campaign) {
  const panes = context.paneWorkspace?.panes ?? [];
  const contextPanes = panes.filter(({ instrumentId, timeframeId }) => (
    instrumentId === campaign.instrumentId && timeframeId === campaign.contextTimeframeId
  ));
  const executionPanes = panes.filter(({ instrumentId, timeframeId }) => (
    instrumentId === campaign.instrumentId && timeframeId === campaign.executionTimeframeId
  ));
  const sma = context.calculatedPanes.flatMap((pane) => pane.instances
    .filter((instance) => instance.definitionRef.definitionId === 'moving-averages.sma.close'
      && instance.effectiveSettings.length === 20)
    .map((instance) => ({
      label: `${instance.legendLabel} · ${pane.workspacePaneId}`,
      paneId: pane.workspacePaneId,
      value: instance.instanceId,
    })));
  const fvg = context.annotationSources
    .filter(({ typeId, status }) => typeId === 'imbalance.fvg' && status === 'active')
    .map((source) => ({ label: `${source.direction} · ${source.artifactId}`, value: source.artifactId }));
  return { contextPanes, executionPanes, fvg, sma };
}

function previewView(preview) {
  return element('section', { className: 'validation-preview', 'aria-live': 'polite' }, [
    element('h3', { text: 'Frozen decision-time evidence' }),
    ...preview.availability.map((entry) => element('article', { className: 'validation-preview-card' }, [
      element('strong', { text: entry.evidenceRole === 'context-sma' ? 'SMA(close,20)' : 'Manual FVG' }),
      statusBadge(entry.status === 'available' ? 'Ready' : 'Source unavailable',
        entry.status === 'available' ? 'good' : 'warn'),
      element('span', { text: entry.reasonCode }),
    ])),
    preview.sharedContext ? element('p', {
      text: `Exclusive Replay cutoff: ${new Date(preview.sharedContext.exclusiveReplayCutoffEpochMs).toISOString()}`,
    }) : element('p', { text: 'Incomplete evidence can be retained as a draft.' }),
  ]);
}

function emptyCaptureView(close) {
  return element('header', {}, [
    element('h2', { text: 'Capture Study Case' }),
    element('p', { text: 'Create an active Validation Campaign first.' }),
    button('Close', close),
  ]);
}

/** Own the bounded capture/outcome dialog mounted outside chart DOM. */
export function createCaptureDialog({ onError, readCaptureContext, runtime }) {
  let active = false;
  let returnFocus = null;
  let preview = null;
  const dialog = element('dialog', { className: 'validation-dialog validation-capture-dialog' });
  const body = element('div');
  const error = element('p', { className: 'validation-dialog-error', role: 'alert' });
  dialog.append(body);
  document.body.append(dialog);

  function close() {
    if (!active) return;
    active = false;
    preview = null;
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
    const context = readCaptureContext();
    const campaigns = runtime.listCampaigns().filter(({ status }) => status === 'active');
    const selectedId = campaignId ?? campaigns[0]?.campaignId;
    if (!selectedId) {
      body.replaceChildren(emptyCaptureView(close));
      return;
    }
    const documentValue = runtime.getCampaign(selectedId);
    const campaign = documentValue.campaign;
    const sources = sourceOptions(context, campaign);
    const form = element('form', { className: 'validation-form' });
    const campaignSelect = select('campaignId', campaigns.map((entry) => ({
      label: `${entry.title} · ${entry.direction}`,
      value: entry.campaignId,
    })));
    campaignSelect.value = selectedId;
    campaignSelect.addEventListener('change', () => renderCapture(campaignSelect.value));
    const defaultSma = sources.sma[0];
    const contextPaneId = defaultSma?.paneId ?? sources.contextPanes[0]?.paneId ?? '';
    const controls = {
      authorLabel: input('authorLabel', campaign.authorLabel),
      confidence: input('confidence', '80', 'number'),
      contextPaneId: select('contextPaneId', sources.contextPanes.map(({ paneId }) => ({ label: paneId, value: paneId }))),
      executionPaneId: select('executionPaneId', sources.executionPanes.map(({ paneId }) => ({ label: paneId, value: paneId }))),
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
    controls.contextPaneId.value = contextPaneId;
    const prepare = button('Review evidence', async () => {
      error.textContent = '';
      try {
        preview = await runtime.prepareCaseObservation({
          campaignId: campaign.campaignId,
          contextPaneId: controls.contextPaneId.value,
          executionPaneId: controls.executionPaneId.value,
          expectedDocumentRevision: runtime.getCampaign(campaign.campaignId).documentRevision,
          fvgArtifactId: controls.fvgArtifactId.value,
          outcomeDefinitionRef: campaign.outcomeDefinitionRef,
          smaInstanceId: controls.smaInstanceId.value,
          setupDefinitionRef: campaign.setupDefinitionRef,
        });
        const existing = form.querySelector('.validation-preview');
        existing?.remove();
        form.insertBefore(previewView(preview), actions);
        commit.disabled = false;
      } catch (cause) { setError(cause); }
    }, 'validation-button validation-button-secondary');
    const commit = button('Record Study Case', async () => {
      if (!preview) return;
      error.textContent = '';
      const classification = controls.qualificationClass.value;
      try {
        const current = runtime.getCampaign(campaign.campaignId);
        const command = {
          authorLabel: controls.authorLabel.value,
          campaignId: campaign.campaignId,
          ...(classification === 'incomplete' ? {
            classificationReason: 'Evidence was incomplete at decision time.',
          } : { explicitConfirmation: classification === 'qualified' }),
          confidence: controls.confidence.value === '' ? null : Number(controls.confidence.value),
          expectedDocumentRevision: current.documentRevision,
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
        await runtime.execute(command);
        close();
      } catch (cause) { setError(cause); }
    }, 'validation-button validation-button-primary');
    commit.disabled = true;
    const actions = element('footer', { className: 'validation-dialog-actions' }, [
      button('Cancel', close, 'validation-button validation-button-ghost'), prepare, commit,
    ]);
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
      field('Notes', controls.notes), error, actions,
    );
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
    const context = readCaptureContext();
    const eligible = runtime.listCampaigns().flatMap((summary) => {
      const documentValue = runtime.getCampaign(summary.campaignId);
      return latestCases(documentValue).filter(({ lifecycleState }) => (
        lifecycleState === 'observation-recorded'
      )).map((record) => ({ documentValue, record }));
    });
    const list = element('div', { className: 'validation-outcome-list' }, eligible.length === 0 ? [
      element('p', { text: 'No observed Case is waiting for an Outcome.' }),
    ] : eligible.map(({ documentValue, record }) => element('article', { className: 'validation-case-row' }, [
      element('div', {}, [
        element('strong', { text: documentValue.campaign.title }),
        element('span', { text: `${record.qualificationClass} · Case ${record.caseId.slice(0, 8)}` }),
      ]),
      button('Record Outcome at current cutoff', async () => {
        try {
          await runtime.execute({
            campaignId: documentValue.campaign.campaignId,
            caseId: record.caseId,
            caseRevision: record.caseRevision,
            expectedDocumentRevision: runtime.getCampaign(documentValue.campaign.campaignId).documentRevision,
            kind: 'record-case-outcome',
            outcomeCutoffEpochMs: context.exclusiveReplayCutoffEpochMs,
          });
          renderOutcome();
        } catch (cause) { setError(cause); }
      }, 'validation-button validation-button-primary'),
    ])));
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
      preview = null;
      try { renderCapture(campaignId); dialog.showModal(); } catch (cause) { setError(cause); }
    },
    openOutcomes(trigger) {
      returnFocus = trigger;
      active = true;
      try { renderOutcome(); dialog.showModal(); } catch (cause) { setError(cause); }
    },
  });
}
