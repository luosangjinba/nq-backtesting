import { createDatabaseImportClient } from './database-import-client.js';

function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let amount = bytes;
  let unit = -1;
  do {
    amount /= 1024;
    unit += 1;
  } while (amount >= 1024 && unit < units.length - 1);
  return `${amount.toFixed(amount >= 10 ? 1 : 2)} ${units[unit]}`;
}

function coverageText(summary) {
  return (summary?.coverage ?? []).map((item) => (
    `${item.instrument}: ${new Intl.NumberFormat('en-US').format(item.rows)} rows · ${item.start} → ${item.end}`
  )).join('\n');
}

/** DOM-only workflow over the separately owned loopback database import service. */
export function createDatabaseImportPanel(options) {
  const root = options.root;
  const client = options.client ?? createDatabaseImportClient(options.clientOptions);
  const signalController = new AbortController();
  const find = (selector) => root.querySelector(selector);
  const section = find('.database-import-section');
  const state = find('#databaseImportState');
  const fileInput = find('#databaseFile');
  const fileNote = find('#databaseFileNote');
  const uploadButton = find('#databaseUpload');
  const prepareButton = find('#databasePrepare');
  const discardButton = find('#databaseDiscard');
  const discardConfirmation = find('#databaseDiscardConfirmation');
  const discardMessage = find('#databaseDiscardMessage');
  const discardCancel = find('#databaseDiscardCancel');
  const discardConfirm = find('#databaseDiscardConfirm');
  const activateButton = find('#databaseActivate');
  const confirmation = find('#databaseConfirmation');
  const report = find('#databaseValidationReport');
  const progress = find('#databaseProgress');
  const progressBar = find('#databaseProgressBar');
  const progressText = find('#databaseProgressText');
  let upload = null;
  let busy = false;
  let importAllowed = false;
  let discardConfirmationOpen = false;

  const discardableStates = new Set(['uploaded', 'ready', 'failed']);
  const retainedStates = new Set(['uploaded', 'preparing', 'ready', 'failed']);

  function setState(label, value) {
    state.textContent = label;
    state.dataset.state = value;
  }

  function renderActions() {
    const retained = retainedStates.has(upload?.state);
    const workflowBlocked = busy || discardConfirmationOpen;
    const showDiscard = importAllowed && retained;
    section.setAttribute('aria-busy', String(busy));
    fileInput.disabled = workflowBlocked || !importAllowed || retained;
    uploadButton.disabled = workflowBlocked || !importAllowed || !fileInput.files?.[0] || upload !== null;
    prepareButton.disabled = workflowBlocked || !importAllowed || upload?.state !== 'uploaded';
    confirmation.disabled = workflowBlocked || !importAllowed || upload?.state !== 'ready';
    activateButton.disabled = workflowBlocked || !importAllowed || upload?.state !== 'ready';
    discardButton.hidden = !showDiscard;
    discardButton.disabled = workflowBlocked || !discardableStates.has(upload?.state);
    discardButton.setAttribute('aria-expanded', String(discardConfirmationOpen));
    discardConfirmation.hidden = !discardConfirmationOpen;
    discardCancel.disabled = busy;
    discardConfirm.disabled = busy;
  }

  function renderJob(job) {
    upload = job;
    fileNote.textContent = `Retained task: ${job.filename} · ${formatBytes(job.sizeBytes)}`;
    const summary = job.summary;
    const lines = [
      `File: ${job.filename}`,
      `Type: ${job.kind}`,
      `Upload: ${formatBytes(job.sizeBytes)} · SHA-256 ${job.sourceSha256}`,
      `State: ${job.state} · ${job.phase}`,
    ];
    if (summary) {
      lines.push(`Candidate: ${formatBytes(summary.candidateBytes)} · ${new Intl.NumberFormat('en-US').format(summary.rows)} rows`);
      lines.push('Duplicates: 0 · Invalid rows: 0');
      lines.push(coverageText(summary));
    }
    if (job.error) lines.push(`Rejected [${job.error.code}]: ${job.error.message}`);
    report.textContent = lines.filter(Boolean).join('\n');
    if (job.state === 'ready') setState('Ready to activate', 'ready');
    else if (job.state === 'failed') setState('Validation failed', 'error');
    else setState(job.phase || job.state, 'loading');
    renderActions();
  }

  function resetTransientControls() {
    fileInput.value = '';
    confirmation.value = '';
    progress.hidden = true;
    progressBar.style.width = '0%';
    progressText.textContent = '0%';
  }

  function resetStagedJob() {
    upload = null;
    discardConfirmationOpen = false;
    resetTransientControls();
    fileNote.textContent = 'Choose one .csv or .duckdb file.';
  }

  async function recoverRetainedJobAfterBusyUpload() {
    const retained = await client.current(signalController.signal);
    resetTransientControls();
    let current = retained;
    renderJob(current);
    if (current.state === 'preparing') {
      current = await client.watch(current.uploadId, {
        onStatus: renderJob,
        signal: signalController.signal,
      });
      renderJob(current);
    }
    report.textContent += '\n\nA previous upload is already staged. Continue it or choose Upload another file.';
  }

  async function refreshHealth() {
    try {
      const health = await client.health(signalController.signal);
      importAllowed = health.importAllowed === true;
      if (health.databaseReady) {
        resetStagedJob();
        setState('Database active', 'ready');
        report.textContent = 'A market database is active. First-run upload and replacement are locked.';
      } else if (!health.bootstrapEnabled) {
        setState('Database setup not enabled', 'warning');
        report.textContent = 'This deployment was not started in first-run bootstrap mode. Redeploy a clean host with --bootstrap to enable database upload.';
      } else if (health.activationLocked) {
        setState('Database import locked', 'error');
        report.textContent = 'A database was activated previously, but its target file is unavailable. Restore the database on the host; first-run import cannot replace it.';
      } else if (!health.importAllowed) {
        setState('Database path blocked', 'error');
        report.textContent = 'The configured database path already exists but is not a regular database file. Resolve it on the host before importing.';
      } else {
        setState('Awaiting database', 'warning');
        report.textContent = `Ready for a strict first-run import. Maximum upload: ${formatBytes(health.maxUploadBytes)}.`;
        try {
          const current = await client.current(signalController.signal);
          renderJob(current);
          if (current.state === 'preparing') {
            renderJob(await client.watch(current.uploadId, {
              onStatus: renderJob,
              signal: signalController.signal,
            }));
          }
        } catch (error) {
          if (error.status !== 404) throw error;
          resetStagedJob();
        }
      }
    } catch (error) {
      importAllowed = false;
      if (error.status === 404) {
        setState('Database setup not enabled', 'warning');
        report.textContent = 'This deployment was not started in first-run bootstrap mode. Redeploy a clean host with --bootstrap to enable database upload.';
      } else {
        setState('Import service unavailable', 'error');
        report.textContent = error.message;
      }
    }
    renderActions();
  }

  fileInput.addEventListener('change', () => {
    upload = null;
    confirmation.value = '';
    progress.hidden = true;
    progressBar.style.width = '0%';
    progressText.textContent = '0%';
    const file = fileInput.files?.[0];
    fileNote.textContent = file ? `${file.name} · ${formatBytes(file.size)}` : 'Choose one .csv or .duckdb file.';
    report.textContent = file ? 'File selected. Uploading does not activate or modify the market database.' : 'No file has been staged.';
    renderActions();
  });

  uploadButton.addEventListener('click', async () => {
    busy = true;
    progress.hidden = false;
    setState('Uploading…', 'loading');
    renderActions();
    try {
      const result = await client.upload(fileInput.files[0], {
        signal: signalController.signal,
        onProgress(loaded, total) {
          const percent = Math.min(100, Math.round((loaded / total) * 100));
          progressBar.style.width = `${percent}%`;
          progressText.textContent = `${percent}%`;
        },
      });
      renderJob(result);
      progressBar.style.width = '100%';
      progressText.textContent = '100%';
    } catch (error) {
      let recovered = false;
      if (error.code === 'DATABASE_IMPORT_BUSY') {
        try {
          await recoverRetainedJobAfterBusyUpload();
          recovered = true;
        } catch {
          // Preserve the authoritative upload error when retained-task recovery is unavailable.
        }
      }
      if (!recovered) {
        setState('Upload failed', 'error');
        report.textContent = `${error.code ? `[${error.code}] ` : ''}${error.message}`;
      }
    } finally {
      busy = false;
      renderActions();
    }
  });

  prepareButton.addEventListener('click', async () => {
    busy = true;
    setState('Validating…', 'loading');
    renderActions();
    try {
      renderJob(await client.prepare(upload.uploadId, {
        signal: signalController.signal,
        onStatus: renderJob,
      }));
    } catch (error) {
      setState('Validation failed', 'error');
      report.textContent = `${error.code ? `[${error.code}] ` : ''}${error.message}`;
    } finally {
      busy = false;
      renderActions();
    }
  });

  discardButton.addEventListener('click', () => {
    if (!discardableStates.has(upload?.state)) return;
    const detail = `${upload.filename} (${formatBytes(upload.sizeBytes)})`;
    discardMessage.textContent = upload.state === 'ready'
      ? `Discard the validated candidate ${detail}? No active database will be changed.`
      : upload.state === 'failed'
        ? `Clear the failed import ${detail} and choose another file? No database was activated.`
        : `Discard the staged file ${detail}? It has not been activated.`;
    discardConfirmationOpen = true;
    renderActions();
    discardConfirm.focus();
  });

  discardCancel.addEventListener('click', () => {
    discardConfirmationOpen = false;
    renderActions();
    discardButton.focus();
  });

  discardConfirm.addEventListener('click', async () => {
    if (!discardableStates.has(upload?.state)) return;
    const uploadId = upload.uploadId;
    busy = true;
    setState('Clearing staged file…', 'loading');
    renderActions();
    let cleared = false;
    try {
      await client.discard(uploadId, signalController.signal);
      resetStagedJob();
      setState('Awaiting database', 'warning');
      report.textContent = 'Previous staged file discarded. Choose a new CSV or DuckDB.';
      cleared = true;
    } catch (error) {
      setState('Could not clear staged file', 'error');
      report.textContent += `\nDiscard failed${error.code ? ` [${error.code}]` : ''}: ${error.message}`;
    } finally {
      busy = false;
      renderActions();
      if (cleared) fileInput.focus();
      else discardConfirm.focus();
    }
  });

  activateButton.addEventListener('click', async () => {
    busy = true;
    setState('Activating…', 'loading');
    renderActions();
    try {
      renderJob(await client.activate(upload.uploadId, confirmation.value, signalController.signal));
      importAllowed = false;
      discardConfirmationOpen = false;
      setState('Database active', 'ready');
      await options.onActivated?.();
    } catch (error) {
      setState('Activation blocked', 'error');
      report.textContent += `\nActivation blocked${error.code ? ` [${error.code}]` : ''}: ${error.message}`;
    } finally {
      busy = false;
      renderActions();
    }
  });

  renderActions();
  void refreshHealth();
  return Object.freeze({
    dispose() { signalController.abort(); },
    refresh: refreshHealth,
  });
}
