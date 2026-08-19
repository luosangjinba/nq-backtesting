import { createAnalysisDrilldownDialog } from './analysis-drilldown-dialog.js';
import { createCampaignAnalysisSection } from './campaign-analysis-section.js';
import { createCampaignCaseSection } from './campaign-case-section.js';
import { createCampaignDialog } from './campaign-create-dialog.js';
import { createCohortFreezeDialog } from './cohort-freeze-dialog.js';
import { button, element, statusBadge } from './dom.js';

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

function statePanel(snapshot) {
  const title = snapshot.status === 'poisoned'
    ? 'Campaign storage needs recovery' : 'Loading Validation Campaigns';
  return element('section', { className: 'validation-state-panel', role: 'status' }, [
    element('h2', { text: title }),
    element('p', { text: snapshot.diagnostic?.message ?? 'Reading local Campaign records…' }),
  ]);
}

function runtimeNotice(snapshot, errorMessage = '', sourceState = null) {
  if (errorMessage) return element('p', {
    className: 'validation-runtime-notice validation-runtime-notice-error',
    role: 'alert',
    text: errorMessage,
  });
  if (snapshot.busy) return element('p', {
    'aria-live': 'polite',
    className: 'validation-runtime-notice',
    role: 'status',
    text: 'Saving Validation Campaign state…',
  });
  if (sourceState === 'source-unavailable') return element('p', {
    className: 'validation-runtime-notice validation-runtime-notice-warn',
    role: 'status',
    text: 'One or more current evidence sources are unavailable. Stored history remains readable.',
  });
  return null;
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
  return shell(element('div', { className: 'validation-page' }, [
    header, runtimeNotice(snapshot, actions.errorMessage), content,
  ]));
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
  const summary = snapshot.campaigns.find((entry) => entry.campaignId === campaignId);
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
    runtimeNotice(snapshot, actions.errorMessage, summary?.sourceResolutionState),
    definitionSummary(documentValue),
    createCampaignCaseSection(documentValue, actions),
    createCampaignAnalysisSection(documentValue, actions),
  ]));
}

/** Route-only Campaign presentation; every mutation stays on the runtime command port. */
export function createCampaignRoute({ download, onRawContextIntent, runtime }) {
  let create = null;
  let cohortDialog = null;
  let drilldownDialog = null;
  let actionError = '';
  let mounted = null;
  let route = null;

  function refresh() {
    if (!mounted || !route) return;
    const run = async (action) => {
      actionError = '';
      try { return await action(); } catch (cause) {
        actionError = cause?.message ?? 'Validation Campaign action failed.';
        refresh();
        return null;
      }
    };
    const actions = {
      errorMessage: actionError,
      onArchive: () => run(async () => {
        const documentValue = runtime.getCampaign(route.campaignId);
        await runtime.execute({
          campaignId: route.campaignId,
          expectedCampaignRevision: documentValue.campaign.revision,
          expectedDocumentRevision: documentValue.documentRevision,
          kind: 'archive-campaign',
        });
      }),
      onCreate: (event) => create.open(event?.currentTarget ?? null),
      onDrilldown: (analysis, metricId, trigger) => drilldownDialog.open(
        route.campaignId, analysis, metricId, trigger,
      ),
      onExport: () => run(async () => {
        const bundle = await runtime.prepareAuditExport(route.campaignId);
        download('v7-validation-campaign-audit-v1.json', JSON.stringify(bundle));
      }),
      onFinalize: (record) => run(() => runtime.execute({
        campaignId: route.campaignId,
        caseId: record.caseId,
        caseRevision: record.caseRevision,
        expectedDocumentRevision: runtime.getCampaign(route.campaignId).documentRevision,
        kind: 'finalize-case',
      })),
      onFreezeCohort: (trigger) => cohortDialog.open(route.campaignId, trigger),
      onRawContext: (record) => run(() => onRawContextIntent(runtime.prepareRawContextIntent({
        campaignId: route.campaignId,
        caseId: record.caseId,
        caseRevision: record.caseRevision,
        contextRole: 'observation',
      }))),
      onRunAnalysis: (cohort) => run(() => runtime.execute({
        authorLabel: runtime.getCampaign(route.campaignId).campaign.authorLabel,
        campaignId: route.campaignId,
        cohortRef: {
          cohortContentDigest: cohort.contentDigest,
          cohortId: cohort.cohortId,
          cohortRevision: cohort.cohortRevision,
        },
        expectedDocumentRevision: runtime.getCampaign(route.campaignId).documentRevision,
        kind: 'run-analysis',
      })),
      onVerify: (record, citation) => run(() => runtime.execute({
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
      })),
    };
    const view = route.campaignId === null
      ? campaignList(runtime, actions) : campaignDetail(runtime, route.campaignId, actions);
    mounted.replaceChildren(view);
  }

  create = createCampaignDialog(runtime, refresh);
  cohortDialog = createCohortFreezeDialog({ onRefresh: refresh, runtime });
  drilldownDialog = createAnalysisDrilldownDialog({ onRawContextIntent, runtime });
  return Object.freeze({
    dispose() {
      create.dispose();
      cohortDialog.dispose();
      drilldownDialog.dispose();
      mounted = null;
      route = null;
    },
    mount({ campaignId = null, root }) { mounted = root; route = { campaignId }; refresh(); },
    refresh,
    unmount() { if (mounted) mounted.replaceChildren(); mounted = null; route = null; },
  });
}
