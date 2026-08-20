import { createCampaignRoute } from './campaign-route.js';
import { createCaptureDialog } from './capture-dialog.js';
import { button, element } from './dom.js';

function requireRuntime(value) {
  for (const method of [
    'execute', 'getCampaign', 'listCampaigns', 'prepareAuditExport',
    'prepareCaseObservation', 'prepareRawContextIntent', 'readAnalysisDrilldown', 'readCase',
    'snapshot', 'subscribe',
  ]) {
    if (typeof value?.[method] !== 'function') {
      throw new TypeError(`Validation Campaign UI requires runtime.${method}().`);
    }
  }
  return value;
}

function requireDownload(value) {
  if (typeof value !== 'function') throw new TypeError('Validation Campaign UI requires download().');
  return value;
}

function requireRawContextIntent(value) {
  if (typeof value !== 'function') {
    throw new TypeError('Validation Campaign UI requires onRawContextIntent().');
  }
  return value;
}

function requireCampaignIntent(value) {
  if (typeof value !== 'function') {
    throw new TypeError('Validation Campaign UI requires onCampaignIntent().');
  }
  return value;
}

function createReplayAttachment({ captureDialog, paneAddonPort }) {
  if (typeof paneAddonPort?.register !== 'function') {
    throw new TypeError('Validation Campaign UI requires a Pane add-on port.');
  }
  const registration = paneAddonPort.register(Object.freeze({
    id: 'adapter.validation-campaign-ui',
    mount({ paneId, shell }) {
      const tools = element('div', {
        className: 'validation-pane-actions',
        dataset: { validationPaneId: paneId },
      });
      const capture = button(
        'Capture Study Case',
        () => captureDialog.openCapture(capture),
        'validation-pane-button',
      );
      const outcomes = button(
        'Pending Outcomes',
        () => captureDialog.openOutcomes(outcomes),
        'validation-pane-button validation-pane-button-secondary',
      );
      tools.append(capture, outcomes);
      shell.append(tools);
      return Object.freeze({
        dispose() { tools.remove(); },
        setWorkspaceDisabled(disabled) {
          capture.disabled = disabled === true;
          outcomes.disabled = disabled === true;
        },
      });
    },
  }));
  return Object.freeze({ dispose: () => registration.unregister() });
}

/** Own Campaign DOM only; all business writes go through the runtime command port. */
export function createValidationCampaignUi({
  download,
  onCampaignIntent,
  onError = () => {},
  onRawContextIntent,
  runtime,
} = {}) {
  const owner = requireRuntime(runtime);
  const saveDownload = requireDownload(download);
  const emitCampaignIntent = requireCampaignIntent(onCampaignIntent);
  const emitRawContext = requireRawContextIntent(onRawContextIntent);
  const replayAttachments = new Set();
  let disposed = false;
  let route = null;
  let started = false;
  let subscription = null;

  function requireStarted() {
    if (disposed) throw new TypeError('Validation Campaign UI is disposed.');
    if (!started) throw new TypeError('Validation Campaign UI is not started.');
  }

  function start() {
    if (disposed) throw new TypeError('Validation Campaign UI is disposed.');
    if (started) return;
    route = createCampaignRoute({
      download: saveDownload,
      onRawContextIntent: emitRawContext,
      runtime: owner,
    });
    subscription = owner.subscribe(() => route?.refresh());
    started = true;
  }

  function stop() {
    if (!started) return;
    for (const attachment of [...replayAttachments]) attachment.dispose();
    replayAttachments.clear();
    subscription?.unsubscribe();
    subscription = null;
    route?.unmount();
    route?.dispose();
    route = null;
    started = false;
  }

  return Object.freeze({
    attachReplayWorkspace({ paneAddonPort, readCaptureContext }) {
      requireStarted();
      if (typeof readCaptureContext !== 'function') {
        throw new TypeError('Replay Campaign attachment requires readCaptureContext().');
      }
      const workspaceDialog = createCaptureDialog({
        onCampaignIntent: emitCampaignIntent,
        onError,
        readCaptureContext,
        runtime: owner,
      });
      const paneAttachment = createReplayAttachment({
        captureDialog: workspaceDialog,
        paneAddonPort,
      });
      let active = true;
      const attachment = Object.freeze({
        dispose() {
          if (!active) return;
          active = false;
          replayAttachments.delete(attachment);
          paneAttachment.dispose();
          workspaceDialog.dispose();
        },
      });
      replayAttachments.add(attachment);
      return attachment;
    },
    dispose() {
      if (disposed) return;
      stop();
      disposed = true;
    },
    mount({ campaignId = null, root }) {
      requireStarted();
      if (!(root instanceof HTMLElement)) {
        throw new TypeError('Validation Campaign route requires an HTMLElement root.');
      }
      route.mount({ campaignId, root });
    },
    snapshot() {
      return Object.freeze({
        disposed,
        replayAttachmentCount: replayAttachments.size,
        started,
      });
    },
    start,
    stop,
    unmount() { route?.unmount(); },
  });
}
