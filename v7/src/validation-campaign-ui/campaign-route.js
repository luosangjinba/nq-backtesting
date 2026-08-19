import { button, element, field, formatNumber, statusBadge } from './dom.js';

function latestCases(documentValue) {
  const byId = new Map();
  for (const record of documentValue.caseRevisions) {
    const current = byId.get(record.caseId);
    if (!current || current.caseRevision < record.caseRevision) byId.set(record.caseId, record);
  }
  return [...byId.values()].sort((left, right) => right.updatedAtEpochMs - left.updatedAtEpochMs);
}

function shell(content, active = 'campaigns') {
  return element('div', { className: 'workstation-shell validation-shell' }, [
    element('aside', { className: 'app-rail', 'aria-label': 'Primary navigation' }, [
      element('a', { className: 'product-mark', href: '#/sessions' }, [
        element('span', { className: 'product-glyph', text: '◇' }),
        element('span', { className: 'product-name', text: 'Replay Lab' }),
      ]),
      element('nav', {}, [
        element('a', { className: 'rail-link', href: '#/sessions', text: 'Sessions' }),
        element('a', {
          className: `rail-link${active === 'campaigns' ? ' is-active' : ''}`,
          href: '#/campaigns', text: 'Validation',
        }),
        element('a', { className: 'rail-link', href: './data-acquisition.html', text: 'Data acquisition' }),
      ]),
      element('div', { className: 'rail-footer' }, [
        element('span', { className: 'foundation-badge', text: 'LOCAL-FIRST' }),
        element('span', { className: 'local-note', text: 'Campaign evidence stays on this device.' }),
      ]),
    ]),
    element('main', { className: 'main-surface validation-main' }, [content]),
  ]);
}

function createDialog(runtime, onRefresh) {
  const dialog = element('dialog', { className: 'validation-dialog' });
  const form = element('form', { className: 'validation-form' });
  const values = {
    authorLabel: element('input', { name: 'authorLabel', value: 'Local researcher' }),
    contextTimeframeId: element('input', { name: 'contextTimeframeId', value: 'timeframe.display-5-minute' }),
    direction: element('select', { name: 'direction' }, [
      element('option', { value: 'long', text: 'Long' }),
      element('option', { value: 'short', text: 'Short' }),
    ]),
    executionTimeframeId: element('input', { name: 'executionTimeframeId', value: 'timeframe.display-1-minute' }),
    instrumentId: element('input', { name: 'instrumentId', value: 'instrument.cme.nq' }),
    sessionHoursId: element('select', { name: 'sessionHoursId' }, [
      element('option', { value: 'session-hours.cme-eth', text: 'CME ETH' }),
      element('option', { value: 'session-hours.cme-rth', text: 'CME RTH' }),
    ]),
    title: element('input', { name: 'title', value: 'SMA + manual FVG validation' }),
  };
  const error = element('p', { className: 'validation-dialog-error', role: 'alert' });
  const close = () => dialog.close();
  form.append(
    field('Campaign title', values.title),
    element('div', { className: 'validation-form-grid' }, [
      field('Instrument id', values.instrumentId),
      field('Direction', values.direction),
      field('Context timeframe id', values.contextTimeframeId),
      field('Execution timeframe id', values.executionTimeframeId),
      field('Session Hours', values.sessionHoursId),
      field('Author', values.authorLabel),
    ]),
    element('p', { className: 'validation-help', text: 'Context and Execution are roles; no universal higher-timeframe rule is imposed.' }),
    error,
    element('footer', { className: 'validation-dialog-actions' }, [
      button('Cancel', close, 'validation-button validation-button-ghost'),
      button('Create Campaign', async () => {
        error.textContent = '';
        try {
          await runtime.execute({
            authorLabel: values.authorLabel.value,
            contextTimeframeId: values.contextTimeframeId.value,
            direction: values.direction.value,
            executionTimeframeId: values.executionTimeframeId.value,
            expectedIndexRevision: runtime.snapshot().indexRevision,
            instrumentId: values.instrumentId.value,
            kind: 'create-campaign',
            sessionHoursId: values.sessionHoursId.value,
            title: values.title.value,
          });
          close();
          onRefresh();
        } catch (cause) { error.textContent = cause.message; }
      }, 'validation-button validation-button-primary'),
    ]),
  );
  dialog.append(
    element('header', { className: 'validation-dialog-header' }, [
      element('div', {}, [
        element('span', { className: 'validation-eyebrow', text: 'R14.1 tracer bullet' }),
        element('h2', { text: 'New Validation Campaign' }),
      ]),
      button('Close', close, 'validation-button validation-button-ghost'),
    ]),
    form,
  );
  document.body.append(dialog);
  return Object.freeze({ dispose: () => dialog.remove(), open: () => dialog.showModal() });
}

function statePanel(snapshot) {
  const title = snapshot.status === 'poisoned'
    ? 'Campaign storage needs recovery' : 'Loading Validation Campaigns';
  return element('section', { className: 'validation-state-panel', role: 'status' }, [
    element('h2', { text: title }),
    element('p', { text: snapshot.diagnostic?.message ?? 'Reading local Campaign records…' }),
  ]);
}

function campaignList(runtime, actions) {
  const snapshot = runtime.snapshot();
  const header = element('header', { className: 'validation-page-header' }, [
    element('div', {}, [
      element('span', { className: 'validation-eyebrow', text: 'Validation workspace' }),
      element('h1', { text: 'Campaigns' }),
      element('p', { text: 'Freeze decision-time evidence, observe later paths, and inspect honest denominators.' }),
    ]),
    button('New Campaign', actions.onCreate, 'validation-button validation-button-primary'),
  ]);
  if (snapshot.status !== 'ready') return shell(element('div', {}, [header, statePanel(snapshot)]));
  const campaigns = runtime.listCampaigns();
  const content = campaigns.length === 0 ? element('section', { className: 'validation-empty' }, [
    element('h2', { text: 'Create the first bounded validation study' }),
    element('p', { text: 'This slice uses only the existing manual FVG and SMA(close,20) sources.' }),
    button('Create Campaign', actions.onCreate, 'validation-button validation-button-primary'),
  ]) : element('section', { className: 'validation-card-grid' }, campaigns.map((campaign) => (
    element('article', { className: 'validation-card' }, [
      element('div', { className: 'validation-card-heading' }, [
        element('div', {}, [
          element('h2', { text: campaign.title }),
          element('span', { text: `${campaign.instrumentId} · ${campaign.direction}` }),
        ]),
        statusBadge(campaign.status === 'active' ? 'Active' : 'Archived',
          campaign.status === 'active' ? 'good' : 'neutral'),
      ]),
      element('dl', { className: 'validation-kpis' }, [
        element('div', {}, [element('dt', { text: 'Cases' }), element('dd', { text: String(campaign.caseCount) })]),
        element('div', {}, [element('dt', { text: 'Revision' }), element('dd', { text: String(campaign.documentRevision) })]),
        element('div', {}, [element('dt', { text: 'Sources' }), element('dd', { text: campaign.sourceResolutionState })]),
      ]),
      element('a', {
        className: 'validation-button validation-button-secondary',
        href: `#/campaigns/${campaign.campaignId}`,
        text: 'Open Campaign',
      }),
    ])
  )));
  return shell(element('div', { className: 'validation-page' }, [header, content]));
}

function definitionSummary(documentValue) {
  const setup = documentValue.setupDefinitions[0];
  const outcome = documentValue.outcomeDefinitions[0];
  return element('section', { className: 'validation-definition-grid' }, [
    element('article', { className: 'validation-card' }, [
      element('span', { className: 'validation-eyebrow', text: 'Setup Definition · 1.0.0' }),
      element('h2', { text: 'SMA trend + manual FVG' }),
      element('p', { text: `Context: SMA(close,${setup.smaPredicate.length}) · Execution: direction-matched active FVG` }),
      element('code', { text: setup.contentDigest }),
    ]),
    element('article', { className: 'validation-card' }, [
      element('span', { className: 'validation-eyebrow', text: 'Outcome Definition · 1.0.0' }),
      element('h2', { text: 'Directional first-touch path' }),
      element('p', { text: 'Target-first, invalidation-first, same-Bar ambiguous, horizon-expired, or incomplete-data.' }),
      element('code', { text: outcome.contentDigest }),
    ]),
  ]);
}

function caseList(documentValue, actions) {
  const cases = latestCases(documentValue);
  return element('section', { className: 'validation-section' }, [
    element('div', { className: 'validation-section-heading' }, [
      element('div', {}, [element('h2', { text: 'Study Cases' }), element('p', { text: `${cases.length} current Case identities; full revisions retained.` })]),
    ]),
    cases.length === 0 ? element('p', { className: 'validation-empty-inline', text: 'Open a Replay Session and use Capture Study Case.' })
      : element('div', { className: 'validation-case-list' }, cases.map((record) => element('article', {
        className: 'validation-case-row',
      }, [
        element('div', {}, [
          element('strong', { text: `${record.qualificationClass} · ${record.lifecycleState}` }),
          element('span', { text: `Case ${record.caseId.slice(0, 8)} · revision ${record.caseRevision}` }),
          element('span', { text: record.outcomeObservation
            ? `${record.outcomeObservation.outcomeClass} · MFE ${formatNumber(record.outcomeObservation.mfePoints)} · MAE ${formatNumber(record.outcomeObservation.maePoints)}`
            : 'Outcome pending' }),
        ]),
        element('div', { className: 'validation-row-actions' }, [
          record.lifecycleState === 'outcome-recorded' ? button('Finalize', () => actions.onFinalize(record)) : null,
          record.evidenceCitations[0] ? button('Verify source', () => actions.onVerify(record, record.evidenceCitations[0])) : null,
          record.observationContext ? button('Open raw context', () => actions.onRawContext(record)) : null,
        ]),
      ]))),
  ]);
}

function analysisSection(documentValue, actions) {
  const finalized = latestCases(documentValue).filter(({ lifecycleState }) => lifecycleState === 'finalized');
  const latestCohort = documentValue.cohorts.at(-1);
  const latest = documentValue.analysisRuns.at(-1);
  return element('section', { className: 'validation-section' }, [
    element('div', { className: 'validation-section-heading' }, [
      element('div', {}, [
        element('h2', { text: 'Frozen Cohort & descriptives' }),
        element('p', { text: 'Rates never hide ambiguous, incomplete, rejected, or source-unavailable Cases.' }),
      ]),
      element('div', { className: 'validation-row-actions' }, [
        button(`Freeze ${finalized.length} finalized`, actions.onFreezeCohort,
          'validation-button validation-button-secondary'),
        latestCohort ? button('Run analysis', () => actions.onRunAnalysis(latestCohort),
          'validation-button validation-button-primary') : null,
      ]),
    ]),
    latest ? element('div', { className: 'validation-metric-grid' }, [
      element('article', { className: 'validation-metric' }, [
        element('span', { text: 'Total Cases' }),
        element('strong', { text: String(latest.counts.total) }),
        button('Inspect members', () => actions.onDrilldown(latest, 'count.total')),
      ]),
      element('article', { className: 'validation-metric' }, [
        element('span', { text: 'Target-first rate' }),
        element('strong', { text: latest.rates.targetFirstRate.value === null
          ? '—' : `${(latest.rates.targetFirstRate.value * 100).toFixed(1)}%` }),
        element('small', { text: `${latest.rates.targetFirstRate.numerator} / ${latest.rates.targetFirstRate.denominator} resolved first touches` }),
        button('Inspect denominator', () => actions.onDrilldown(latest, 'rate.target-first')),
      ]),
      element('article', { className: 'validation-metric' }, [
        element('span', { text: 'Same-Bar ambiguous' }),
        element('strong', { text: String(latest.counts.sameBarAmbiguous) }),
      ]),
      element('article', { className: 'validation-metric' }, [
        element('span', { text: 'Source unavailable' }),
        element('strong', { text: String(latest.counts.sourceUnavailableCount) }),
      ]),
    ]) : element('p', { className: 'validation-empty-inline', text: 'Freeze finalized Case revisions, then run the fixed metric set.' }),
  ]);
}

function campaignDetail(runtime, campaignId, actions) {
  const snapshot = runtime.snapshot();
  if (snapshot.status !== 'ready') return shell(statePanel(snapshot));
  let documentValue;
  try { documentValue = runtime.getCampaign(campaignId); } catch {
    return shell(element('section', { className: 'validation-state-panel' }, [
      element('h1', { text: 'Campaign not found' }),
      element('a', { href: '#/campaigns', text: 'Return to Campaigns' }),
    ]));
  }
  const campaign = documentValue.campaign;
  return shell(element('div', { className: 'validation-page' }, [
    element('header', { className: 'validation-page-header' }, [
      element('div', {}, [
        element('a', { className: 'validation-back-link', href: '#/campaigns', text: '← All Campaigns' }),
        element('span', { className: 'validation-eyebrow', text: `${campaign.instrumentId} · ${campaign.direction}` }),
        element('h1', { text: campaign.title }),
        element('p', { text: `${campaign.contextTimeframeId} context · ${campaign.executionTimeframeId} execution · ${campaign.sessionHoursId}` }),
      ]),
      element('div', { className: 'validation-row-actions' }, [
        button('Export audit JSON', actions.onExport, 'validation-button validation-button-secondary'),
        campaign.status === 'active' ? button('Archive', actions.onArchive) : statusBadge('Archived'),
      ]),
    ]),
    definitionSummary(documentValue),
    caseList(documentValue, actions),
    analysisSection(documentValue, actions),
  ]));
}

/** Route-only Campaign presentation; every mutation stays on the runtime command port. */
export function createCampaignRoute({ download, onRawContextIntent, runtime }) {
  let create = null;
  let mounted = null;
  let route = null;

  function refresh() {
    if (!mounted || !route) return;
    const actions = {
      onArchive: async () => {
        const documentValue = runtime.getCampaign(route.campaignId);
        await runtime.execute({
          campaignId: route.campaignId,
          expectedCampaignRevision: documentValue.campaign.revision,
          expectedDocumentRevision: documentValue.documentRevision,
          kind: 'archive-campaign',
        });
      },
      onCreate: () => create.open(),
      onDrilldown: (analysis, metricId) => {
        const detail = runtime.readAnalysisDrilldown(route.campaignId, analysis.analysisRunId, metricId);
        window.alert(`${metricId}\n${detail.caseRefs.map((ref) => `${ref.caseId} r${ref.caseRevision}`).join('\n') || 'No eligible Cases'}`);
      },
      onExport: async () => {
        const bundle = await runtime.prepareAuditExport(route.campaignId);
        download('v7-validation-campaign-audit-v1.json', JSON.stringify(bundle));
      },
      onFinalize: async (record) => runtime.execute({
        campaignId: route.campaignId,
        caseId: record.caseId,
        caseRevision: record.caseRevision,
        expectedDocumentRevision: runtime.getCampaign(route.campaignId).documentRevision,
        kind: 'finalize-case',
      }),
      onFreezeCohort: async () => {
        const documentValue = runtime.getCampaign(route.campaignId);
        const members = latestCases(documentValue).filter(({ lifecycleState }) => (
          lifecycleState === 'finalized'
        )).map((record) => ({
          caseContentDigest: record.contentDigest,
          caseId: record.caseId,
          caseRevision: record.caseRevision,
        }));
        await runtime.execute({
          authorLabel: documentValue.campaign.authorLabel,
          campaignId: route.campaignId,
          excludedCaseRefs: [],
          expectedDocumentRevision: documentValue.documentRevision,
          kind: 'freeze-cohort',
          manualOverrideReasons: [],
          memberCaseRefs: members,
          name: `Frozen cohort ${documentValue.cohorts.length + 1}`,
          parentCohortRef: null,
        });
      },
      onRawContext: async (record) => onRawContextIntent(await runtime.prepareRawContextIntent({
        campaignId: route.campaignId,
        caseId: record.caseId,
        caseRevision: record.caseRevision,
        contextRole: 'observation',
      })),
      onRunAnalysis: async (cohort) => runtime.execute({
        authorLabel: runtime.getCampaign(route.campaignId).campaign.authorLabel,
        campaignId: route.campaignId,
        cohortRef: {
          cohortContentDigest: cohort.contentDigest,
          cohortId: cohort.cohortId,
          cohortRevision: cohort.cohortRevision,
        },
        expectedDocumentRevision: runtime.getCampaign(route.campaignId).documentRevision,
        kind: 'run-analysis',
      }),
      onVerify: async (record, citation) => runtime.execute({
        campaignId: route.campaignId,
        caseId: record.caseId,
        caseRevision: record.caseRevision,
        citationRef: {
          citationContentDigest: citation.contentDigest,
          citationId: citation.citationId,
          citationRevision: citation.citationRevision,
        },
        expectedDocumentRevision: runtime.getCampaign(route.campaignId).documentRevision,
        kind: 'verify-source',
      }),
    };
    const view = route.campaignId === null
      ? campaignList(runtime, actions) : campaignDetail(runtime, route.campaignId, actions);
    mounted.replaceChildren(view);
  }

  create = createDialog(runtime, refresh);
  return Object.freeze({
    dispose() { create.dispose(); mounted = null; route = null; },
    mount({ campaignId = null, root }) { mounted = root; route = { campaignId }; refresh(); },
    refresh,
    unmount() { if (mounted) mounted.replaceChildren(); mounted = null; route = null; },
  });
}
