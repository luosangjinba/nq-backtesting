import { createMaintenanceClient } from './maintenance-client.js';
import { createAcquisitionWorkflow, parseOutputMetric } from './workflow-state.js';

function easternInput(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function shiftInputMinute(value, minutes) {
  const date = new Date(`${String(value).replace(' ', 'T').slice(0, 16)}:00Z`);
  date.setUTCMinutes(date.getUTCMinutes() + minutes);
  return date.toISOString().slice(0, 16);
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value) || 0);
}

function template() {
  return `
    <div class="data-admin-shell">
      <aside class="data-admin-rail" aria-label="Admin navigation">
        <a class="data-admin-brand" href="./index.html#/sessions" aria-label="Replay Lab sessions">
          <span class="data-admin-brand-mark" aria-hidden="true">◇</span>
          <span>Replay Lab</span>
        </a>
        <nav>
          <a href="./index.html#/sessions">Sessions</a>
          <a class="is-active" href="./data-acquisition.html" aria-current="page">Data acquisition</a>
        </nav>
        <p>Local admin surface<br>Insert-only writes</p>
      </aside>
      <main class="data-admin-main">
        <header class="data-admin-header">
          <div>
            <span class="data-admin-eyebrow">Foundation operations</span>
            <h1>Data acquisition</h1>
            <p>Databento → guarded insert-only DuckDB → V4 bars API → V7 provider.</p>
          </div>
          <div class="data-admin-service" id="serviceState" data-state="loading">
            <span aria-hidden="true"></span><strong>Checking service…</strong>
          </div>
        </header>

        <div class="data-admin-content">
          <section class="data-admin-section" aria-labelledby="coverageTitle">
            <div class="data-admin-section-heading">
              <div><h2 id="coverageTitle">Authoritative coverage</h2><p>Read-only DuckDB state. Duplicate timestamps are a hard stop.</p></div>
              <button class="data-button" id="refreshCoverage" type="button">Refresh status</button>
            </div>
            <div class="coverage-grid" id="coverageGrid" aria-live="polite">
              <article class="coverage-card is-loading"><strong>ES</strong><span>Loading…</span></article>
              <article class="coverage-card is-loading"><strong>NQ</strong><span>Loading…</span></article>
            </div>
            <div class="environment-strip" id="environmentStrip">Checking Databento and database configuration…</div>
          </section>

          <section class="data-admin-section" aria-labelledby="workflowTitle">
            <div class="data-admin-section-heading">
              <div><h2 id="workflowTitle">Selected-range refresh</h2><p>Changing any range field invalidates prior Preflight and Dry Run evidence.</p></div>
              <button class="data-button" id="rollReport" type="button">Roll report</button>
            </div>
            <form id="refreshForm" class="data-refresh-form">
              <label>Instrument<select id="instrument"><option>ES</option><option>NQ</option></select></label>
              <label>Start · New York time<input id="start" type="datetime-local" step="60"></label>
              <label>End · New York time (exclusive)<input id="end" type="datetime-local" step="60"></label>
              <label>Chunk days<input id="chunkDays" type="number" min="1" max="30" value="3"></label>
            </form>
            <div class="workflow-gates" id="workflowGates">
              <div data-gate="preflight"><span>1</span><strong>Preflight</strong><small>Required</small></div>
              <div data-gate="dry-run"><span>2</span><strong>Dry Run</strong><small>Locked</small></div>
              <div data-gate="backup"><span>3</span><strong>Verified backup</strong><small>Locked</small></div>
              <div data-gate="write"><span>4</span><strong>Insert-only write</strong><small>Locked</small></div>
              <div data-gate="verify"><span>5</span><strong>V7 read verify</strong><small>After write</small></div>
            </div>
            <div class="data-action-row">
              <button class="data-button" id="preflight" type="button">Run Preflight</button>
              <button class="data-button data-button-primary" id="dryRun" type="button">Run Dry Run</button>
              <button class="data-button" id="backup" type="button">Backup database</button>
              <label class="confirm-field">Confirmation<input id="confirmation" autocomplete="off" placeholder="WRITE ES"></label>
              <button class="data-button data-button-danger" id="write" type="button" disabled>Write missing rows</button>
            </div>
            <p class="write-note">Writes never update or delete existing <code>(instrument, timestamp)</code> rows. A blocked roll segment or dirty Dry Run keeps Write disabled.</p>
          </section>

          <section class="data-admin-section data-output-section" aria-labelledby="activityTitle">
            <div class="data-admin-section-heading">
              <div><h2 id="activityTitle">Activity</h2><p id="jobStatus">No maintenance task is running.</p></div>
              <div class="data-output-actions">
                <button class="data-button" id="verifyRead" type="button">Verify selected V7 feed</button>
                <button class="data-button" id="clearOutput" type="button">Clear</button>
              </div>
            </div>
            <pre id="output" tabindex="0" aria-live="polite">Ready.</pre>
          </section>
        </div>
      </main>
    </div>`;
}

function requireRoot(root) {
  if (!(root instanceof HTMLElement)) throw new TypeError('Data Acquisition surface requires an HTMLElement root.');
  return root;
}

export function createDataAcquisitionSurface(options) {
  const root = requireRoot(options.root);
  const client = options.client ?? createMaintenanceClient(options.clientOptions);
  const abortController = new AbortController();
  const defaultEnd = easternInput();
  const defaultStart = easternInput(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const workflow = createAcquisitionWorkflow({ instrument: 'ES', start: defaultStart, end: defaultEnd, chunkDays: 3 });
  let coverage = new Map();
  let disposed = false;
  let busy = false;
  let activeSelectionKey = JSON.stringify(workflow.snapshot().selection);

  root.innerHTML = template();
  const find = (selector) => root.querySelector(selector);
  const controls = {
    instrument: find('#instrument'), start: find('#start'), end: find('#end'), chunkDays: find('#chunkDays'),
    confirmation: find('#confirmation'), write: find('#write'), dryRun: find('#dryRun'),
    preflight: find('#preflight'), backup: find('#backup'),
    output: find('#output'), jobStatus: find('#jobStatus'),
  };
  controls.start.value = defaultStart;
  controls.end.value = defaultEnd;

  function appendOutput(title, result) {
    const body = typeof result === 'string' ? result : result?.output || result?.error || JSON.stringify(result, null, 2);
    const next = `${controls.output.textContent}\n\n> ${title}\n${body}`.trim();
    controls.output.textContent = next;
    controls.output.scrollTop = controls.output.scrollHeight;
  }

  function selection() {
    return {
      instrument: controls.instrument.value,
      start: controls.start.value,
      end: controls.end.value,
      chunkDays: Number(controls.chunkDays.value),
    };
  }

  function renderGates(snapshot = workflow.snapshot()) {
    const preflight = find('[data-gate="preflight"]');
    const dryRun = find('[data-gate="dry-run"]');
    const backup = find('[data-gate="backup"]');
    const write = find('[data-gate="write"]');
    preflight.dataset.state = snapshot.preflightAccepted ? 'passed' : 'pending';
    preflight.querySelector('small').textContent = snapshot.preflightAccepted ? 'Passed' : 'Required';
    dryRun.dataset.state = snapshot.dryRunAccepted ? 'passed' : snapshot.preflightAccepted ? 'ready' : 'locked';
    dryRun.querySelector('small').textContent = snapshot.dryRunAccepted
      ? `${formatNumber(snapshot.dryRunSummary.wouldInsert)} rows`
      : snapshot.preflightAccepted ? 'Ready' : 'Locked';
    backup.dataset.state = snapshot.backupAccepted ? 'passed' : snapshot.dryRunAccepted ? 'ready' : 'locked';
    backup.querySelector('small').textContent = snapshot.backupAccepted
      ? 'Restore smoke passed'
      : snapshot.dryRunAccepted ? 'Required' : 'Locked';
    write.dataset.state = snapshot.canWrite ? 'ready' : 'locked';
    write.querySelector('small').textContent = snapshot.canWrite ? 'Confirmation required' : 'Locked';
    controls.confirmation.placeholder = snapshot.expectedConfirmation;
    controls.write.disabled = busy || !snapshot.canWrite;
    controls.preflight.disabled = busy || !snapshot.coverageAccepted;
    controls.dryRun.disabled = busy || !snapshot.preflightAccepted;
    controls.backup.disabled = busy || !snapshot.dryRunAccepted;
  }

  function resetVerifyGate() {
    const verify = find('[data-gate="verify"]');
    verify.dataset.state = 'pending';
    verify.querySelector('small').textContent = 'After write';
  }

  function updateSelection() {
    try {
      const snapshot = workflow.updateSelection(selection());
      const nextSelectionKey = JSON.stringify(snapshot.selection);
      if (nextSelectionKey !== activeSelectionKey) {
        activeSelectionKey = nextSelectionKey;
        resetVerifyGate();
      }
      renderGates(snapshot);
      return true;
    } catch (error) {
      workflow.clearEvidence();
      resetVerifyGate();
      renderGates();
      appendOutput('selection', error.message);
      return false;
    }
  }

  function setBusy(next, label = '') {
    busy = next;
    root.dataset.busy = String(next);
    root.querySelectorAll('button, input, select').forEach((control) => {
      if (control.id === 'clearOutput') return;
      control.disabled = next;
    });
    controls.jobStatus.textContent = next ? label || 'Maintenance task running…' : 'No maintenance task is running.';
    if (!next) renderGates();
  }

  function renderCoverage(items) {
    coverage = new Map(items.map((item) => [item.instrument, item]));
    find('#coverageGrid').replaceChildren(...items.map((item) => {
      const card = document.createElement('article');
      const header = document.createElement('div');
      const instrument = document.createElement('strong');
      const integrity = document.createElement('span');
      const details = document.createElement('dl');
      card.className = `coverage-card${item.integrity === 'ok' ? '' : ' has-error'}`;
      instrument.textContent = item.instrument;
      integrity.className = 'coverage-integrity';
      integrity.textContent = item.integrity;
      header.append(instrument, integrity);
      [
        ['Latest', item.latestTimestamp || 'No data'],
        ['Age', `${item.ageHours ?? '—'} hours`],
        ['Rows', formatNumber(item.rows)],
        ['Duplicates', formatNumber(item.duplicateTimestamps)],
      ].forEach(([label, value]) => {
        const row = document.createElement('div');
        const term = document.createElement('dt');
        const description = document.createElement('dd');
        term.textContent = label;
        description.textContent = value;
        row.append(term, description);
        details.append(row);
      });
      card.append(header, details);
      return card;
    }));
    renderGates(workflow.recordCoverage(items));
  }

  function applyCoverageStart(instrument) {
    const latest = coverage.get(instrument)?.latestTimestamp;
    if (latest) controls.start.value = shiftInputMinute(latest, 1);
    controls.end.value = easternInput();
    updateSelection();
  }

  async function refreshStatus({ resetStart = false } = {}) {
    const service = find('#serviceState');
    try {
      const [coverageResult, environmentResult] = await Promise.all([
        client.request(
          { action: 'coverage_status' },
          { signal: abortController.signal, acceptErrorResult: true },
        ),
        client.request({ action: 'environment_status' }, { signal: abortController.signal }),
      ]);
      if (!Array.isArray(coverageResult.coverage)) {
        throw new Error(coverageResult.output || 'Coverage check returned no structured result.');
      }
      renderCoverage(coverageResult.coverage || []);
      const apiKey = environmentResult.environment?.find((row) => row.key === 'DATABENTO_API_KEY');
      const database = environmentResult.environment?.find((row) => row.key === 'V4_TRADING_DB');
      find('#environmentStrip').textContent = `Databento: ${apiKey?.processSet ? 'configured in API process' : 'not configured'} · Database override: ${database?.processSet ? 'active' : 'default path'} · API: ${client.apiBase || 'same origin'}`;
      service.dataset.state = coverageResult.ok ? 'ready' : 'error';
      service.querySelector('strong').textContent = coverageResult.ok
        ? 'Maintenance API ready'
        : 'Coverage integrity failed';
      if (!coverageResult.ok) appendOutput('coverage', coverageResult);
      if (resetStart) applyCoverageStart(controls.instrument.value);
    } catch (error) {
      renderGates(workflow.recordCoverage([]));
      service.dataset.state = 'error';
      service.querySelector('strong').textContent = 'Maintenance API unavailable';
      const card = document.createElement('article');
      const title = document.createElement('strong');
      const detail = document.createElement('span');
      card.className = 'coverage-card has-error';
      title.textContent = 'Unavailable';
      detail.textContent = error.message;
      card.append(title, detail);
      find('#coverageGrid').replaceChildren(card);
      find('#environmentStrip').textContent = 'Start the current V4 API and allow this local V7 origin before attempting maintenance.';
      appendOutput('status', error.message);
    }
  }

  async function runWorkflowAction(action) {
    let taskStarted = false;
    try {
      if (!updateSelection()) return;
      const selected = workflow.snapshot().selection;
      const selectedKey = JSON.stringify(selected);
      const request = { action, ...selected };
      if (action === 'write') {
        workflow.assertWriteAllowed(controls.confirmation.value);
        const dryRunSummary = workflow.snapshot().dryRunSummary;
        request.start = dryRunSummary.effectiveStart;
        request.end = dryRunSummary.effectiveEnd;
        request.confirmText = controls.confirmation.value.trim();
      }
      setBusy(true, `${action.replace('_', ' ')} running…`);
      taskStarted = true;
      const result = await client.runJob(request, {
        signal: abortController.signal,
        onStatus: (job) => {
          controls.jobStatus.textContent = `${job.action} · ${job.state} · ${job.jobId}`;
        },
      });
      appendOutput(action, result);
      if (selectedKey !== JSON.stringify(workflow.snapshot().selection)) {
        workflow.clearEvidence();
        resetVerifyGate();
        appendOutput(action, 'Selection changed while the task was running; its gate evidence was discarded.');
        if (action === 'write') await refreshStatus();
        return;
      }
      if (action === 'preflight') renderGates(workflow.recordPreflight(result));
      else if (action === 'dry_run') renderGates(workflow.recordDryRun(result));
      else if (action === 'backup') renderGates(workflow.recordBackup(result));
      else if (action === 'write') {
        if (!result.ok) throw new Error(result.output || 'Insert-only write failed.');
        workflow.clearEvidence();
        controls.confirmation.value = '';
        await refreshStatus();
        await verifySelectedRead();
      }
      if (!result.ok) throw new Error(result.output || `${action} failed.`);
    } catch (error) {
      appendOutput(action, error.message);
    } finally {
      if (taskStarted) setBusy(false);
    }
  }

  async function runRollReport() {
    setBusy(true, 'roll report running…');
    try {
      const result = await client.runJob({ action: 'roll_report' }, {
        signal: abortController.signal,
        onStatus: (job) => { controls.jobStatus.textContent = `${job.action} · ${job.state}`; },
      });
      appendOutput('roll_report', result);
    } catch (error) {
      appendOutput('roll_report', error.message);
    } finally {
      setBusy(false);
    }
  }

  async function verifySelectedRead() {
    const item = coverage.get(controls.instrument.value);
    if (!item?.latestTimestamp) throw new Error(`No ${controls.instrument.value} coverage is available to verify.`);
    const result = await client.verifyV7Read({
      instrument: item.instrument,
      latestTimestamp: item.latestTimestamp,
      signal: abortController.signal,
    });
    find('[data-gate="verify"]').dataset.state = 'passed';
    find('[data-gate="verify"] small').textContent = `${result.returnedBars} bars returned`;
    appendOutput('v7_feed_verify', `instrument: ${result.instrument}\nreturned_bars: ${result.returnedBars}\nrange: ${result.requestedStart} -> ${result.requestedEnd}\nstatus: ok`);
  }

  async function resumeRetainedJob() {
    try {
      const retained = await client.request({ action: 'job_status' }, { signal: abortController.signal });
      if (retained.job?.state !== 'running' || !retained.job.jobId) return;
      setBusy(true, `${retained.job.action} · resumed status monitoring…`);
      const result = await client.watchJob(retained.job.jobId, {
        signal: abortController.signal,
        onStatus: (job) => { controls.jobStatus.textContent = `${job.action} · ${job.state} · ${job.jobId}`; },
      });
      appendOutput(`resumed ${retained.job.action}`, result);
      await refreshStatus();
    } catch (error) {
      if (error.name !== 'AbortError' && !/No retained/.test(error.message)) appendOutput('retained job', error.message);
    } finally {
      setBusy(false);
    }
  }

  ['instrument', 'start', 'end', 'chunkDays'].forEach((id) => {
    find(`#${id}`).addEventListener('change', () => {
      if (id === 'instrument') applyCoverageStart(controls.instrument.value);
      else updateSelection();
    });
  });
  find('#preflight').addEventListener('click', () => runWorkflowAction('preflight'));
  find('#dryRun').addEventListener('click', () => runWorkflowAction('dry_run'));
  find('#backup').addEventListener('click', () => runWorkflowAction('backup'));
  find('#write').addEventListener('click', () => runWorkflowAction('write'));
  find('#rollReport').addEventListener('click', runRollReport);
  find('#refreshCoverage').addEventListener('click', () => refreshStatus({ resetStart: true }));
  find('#verifyRead').addEventListener('click', () => verifySelectedRead().catch((error) => appendOutput('v7_feed_verify', error.message)));
  find('#clearOutput').addEventListener('click', () => { controls.output.textContent = 'Ready.'; });

  renderGates();
  refreshStatus({ resetStart: true }).then(resumeRetainedJob);

  return Object.freeze({
    dispose() {
      if (disposed) return;
      disposed = true;
      abortController.abort();
      root.replaceChildren();
    },
  });
}
