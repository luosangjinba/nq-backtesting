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

export function databaseImportTemplate() {
  return `
    <section class="data-admin-section database-import-section" aria-labelledby="databaseImportTitle">
      <div class="data-admin-section-heading">
        <div>
          <h2 id="databaseImportTitle">Database setup</h2>
          <p>First-run only. Upload CSV for server-side conversion, or upload a ready DuckDB.</p>
        </div>
        <span class="database-import-state" id="databaseImportState" data-state="loading">Checking…</span>
      </div>
      <div class="database-contract">
        <strong>Strict input contract</strong>
        <code>instrument,ts,open,high,low,close,volume</code>
        <span>UTF-8 · timestamps YYYY-MM-DD HH:MM:SS · ES/NQ · no automatic renaming, timezone conversion, coercion, or deduplication.</span>
      </div>
      <div class="database-import-controls">
        <label class="database-file-field">
          Source file
          <input id="databaseFile" type="file" accept=".csv,.duckdb,text/csv,application/octet-stream">
          <span id="databaseFileNote">Choose one .csv or .duckdb file.</span>
        </label>
        <button class="data-button" id="databaseUpload" type="button" disabled>1 · Upload</button>
        <button class="data-button data-button-primary" id="databasePrepare" type="button" disabled>2 · Validate</button>
      </div>
      <div class="database-progress" id="databaseProgress" hidden>
        <div><span id="databaseProgressBar"></span></div><strong id="databaseProgressText">0%</strong>
      </div>
      <pre class="database-validation-report" id="databaseValidationReport" aria-live="polite">No file has been staged.</pre>
      <div class="database-activation-row">
        <label class="confirm-field">Activation confirmation
          <input id="databaseConfirmation" autocomplete="off" placeholder="ACTIVATE DATABASE" disabled>
        </label>
        <button class="data-button data-button-danger" id="databaseActivate" type="button" disabled>3 · Activate database</button>
      </div>
      <p class="write-note">Activation is an atomic first-database operation. Once a database exists, this importer locks and cannot replace it.</p>
    </section>`;
}

/** DOM-only workflow over the separately owned loopback database import service. */
export function createDatabaseImportPanel(options) {
  const root = options.root;
  const client = options.client ?? createDatabaseImportClient(options.clientOptions);
  const signalController = new AbortController();
  const find = (selector) => root.querySelector(selector);
  const state = find('#databaseImportState');
  const fileInput = find('#databaseFile');
  const fileNote = find('#databaseFileNote');
  const uploadButton = find('#databaseUpload');
  const prepareButton = find('#databasePrepare');
  const activateButton = find('#databaseActivate');
  const confirmation = find('#databaseConfirmation');
  const report = find('#databaseValidationReport');
  const progress = find('#databaseProgress');
  const progressBar = find('#databaseProgressBar');
  const progressText = find('#databaseProgressText');
  let upload = null;
  let busy = false;
  let importAllowed = false;

  function setState(label, value) {
    state.textContent = label;
    state.dataset.state = value;
  }

  function renderActions() {
    fileInput.disabled = busy || !importAllowed;
    uploadButton.disabled = busy || !importAllowed || !fileInput.files?.[0] || upload !== null;
    prepareButton.disabled = busy || !importAllowed || upload?.state !== 'uploaded';
    confirmation.disabled = busy || !importAllowed || upload?.state !== 'ready';
    activateButton.disabled = busy || !importAllowed || upload?.state !== 'ready';
  }

  function renderJob(job) {
    upload = job;
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

  async function refreshHealth() {
    try {
      const health = await client.health(signalController.signal);
      importAllowed = health.importAllowed === true;
      if (health.databaseReady) {
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
      setState('Upload failed', 'error');
      report.textContent = `${error.code ? `[${error.code}] ` : ''}${error.message}`;
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

  activateButton.addEventListener('click', async () => {
    busy = true;
    setState('Activating…', 'loading');
    renderActions();
    try {
      renderJob(await client.activate(upload.uploadId, confirmation.value, signalController.signal));
      importAllowed = false;
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
