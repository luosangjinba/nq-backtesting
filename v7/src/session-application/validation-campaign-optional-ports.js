import { createValidationWorkspaceBridge } from './validation-workspace-bridge.js';

const IDS = Object.freeze({
  audit: 'adapter.validation-campaign-audit-export',
  domain: 'optional.validation-study-domain',
  fvg: 'adapter.validation-fvg-evidence',
  outcome: 'adapter.validation-outcome-window',
  persistence: 'adapter.validation-campaign-persistence',
  runtime: 'optional.validation-campaign-runtime',
  sma: 'adapter.validation-sma-evidence',
  ui: 'adapter.validation-campaign-ui',
});

function requireFactory(api, method, moduleId) {
  if (typeof api?.[method] !== 'function') {
    throw new TypeError(`adapter.session-application received an invalid ${moduleId} port.`);
  }
  return api;
}

function downloadJson(browserWindow, filename, raw) {
  if (typeof raw !== 'string' || typeof filename !== 'string') {
    throw new TypeError('Validation Campaign download payload is invalid.');
  }
  const blob = new browserWindow.Blob([raw], { type: 'application/json;charset=utf-8' });
  const url = browserWindow.URL.createObjectURL(blob);
  const anchor = browserWindow.document.createElement('a');
  anchor.download = filename;
  anchor.href = url;
  anchor.hidden = true;
  browserWindow.document.body.append(anchor);
  try { anchor.click(); } finally {
    anchor.remove();
    browserWindow.URL.revokeObjectURL(url);
  }
}

/** Validate only the eight accepted removable R14.1 optional module ports. */
export function validateValidationCampaignOptionalPorts(optionalPorts) {
  const values = Object.fromEntries(Object.entries(IDS).map(([name, id]) => [
    name, optionalPorts[id] ?? null,
  ]));
  const present = Object.values(values).filter(Boolean).length;
  if (present === 0) return Object.freeze({ ...values, available: false });
  if ([values.domain, values.persistence, values.outcome, values.audit, values.runtime, values.ui]
    .some((value) => value === null)) {
    return Object.freeze({ ...values, available: false });
  }
  requireFactory(values.domain, 'canonicalJson', IDS.domain);
  requireFactory(values.persistence, 'createValidationCampaignPersistenceAdapter', IDS.persistence);
  requireFactory(values.outcome, 'createValidationOutcomeWindowAdapter', IDS.outcome);
  requireFactory(values.audit, 'createValidationCampaignAuditExporter', IDS.audit);
  requireFactory(values.runtime, 'createValidationCampaignRuntime', IDS.runtime);
  requireFactory(values.ui, 'createValidationCampaignUi', IDS.ui);
  if (values.fvg) requireFactory(values.fvg, 'createValidationFvgEvidenceProvider', IDS.fvg);
  if (values.sma) requireFactory(values.sma, 'createValidationSmaEvidenceProvider', IDS.sma);
  return Object.freeze({ ...values, available: true });
}

/** Compose the app-scoped Campaign owner over one explicit local storage surface. */
export async function createValidationCampaignFeature({
  browserWindow,
  composed,
  crypto,
  navigation,
  optional,
} = {}) {
  if (!optional.available) return null;
  const bridge = createValidationWorkspaceBridge();
  const persistence = optional.persistence.createValidationCampaignPersistenceAdapter({
    storage: composed.storageAdapter,
  });
  const auditExporter = optional.audit.createValidationCampaignAuditExporter({ crypto });
  const evidenceProviders = [];
  if (optional.fvg) evidenceProviders.push(optional.fvg.createValidationFvgEvidenceProvider({
    crypto,
    readObservation: bridge.readFvg,
  }));
  if (optional.sma) evidenceProviders.push(optional.sma.createValidationSmaEvidenceProvider({
    crypto,
    readObservation: bridge.readSma,
  }));
  const outcomeAdapter = Object.freeze({
    observeOutcome: (request, signal) => bridge.observeOutcome(request, signal),
  });
  const runtime = await optional.runtime.createValidationCampaignRuntime({
    auditExporter,
    crypto,
    evidenceProviders,
    idFactory: () => crypto.randomUUID(),
    nowEpochMs: () => Date.now(),
    outcomeAdapter,
    persistence,
  });
  let pendingRawContextIntent = null;
  const ui = optional.ui.createValidationCampaignUi({
    download: (filename, raw) => downloadJson(browserWindow, filename, raw),
    onRawContextIntent(intent) {
      pendingRawContextIntent = intent;
      navigation.go(`#\/session\/${encodeURIComponent(intent.sessionId)}`);
    },
    runtime,
  });
  ui.start();
  let disposed = false;
  return Object.freeze({
    bridge,
    dispose() {
      if (disposed) return;
      disposed = true;
      ui.dispose();
      runtime.dispose();
      bridge.dispose();
      pendingRawContextIntent = null;
    },
    replayConfiguration: Object.freeze({
      bridge,
      crypto,
      outcomeApi: optional.outcome,
      takeRawContextIntent(sessionId) {
        if (pendingRawContextIntent?.sessionId !== sessionId) return null;
        const intent = pendingRawContextIntent;
        pendingRawContextIntent = null;
        return intent;
      },
      ui,
    }),
    runtime,
    ui,
  });
}
