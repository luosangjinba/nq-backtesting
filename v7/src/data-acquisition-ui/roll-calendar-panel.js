function shiftIsoDate(value, days) {
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function rollCalendarTemplate() {
  return `<section class="data-admin-section" id="rollCalendarSection" aria-labelledby="rollCalendarTitle">
    <div class="data-admin-section-heading">
      <div>
        <h2 id="rollCalendarTitle">Contract Roll</h2>
        <p>Complete CME trade-date volume evidence → Preview → typed atomic commit. Historical rows remain protected.</p>
      </div>
      <button class="data-button" id="refreshRollHealth" type="button">Refresh roll health</button>
    </div>
    <div class="roll-health-grid" id="rollHealthGrid" aria-live="polite">
      <article class="roll-health-card is-loading"><strong>ES</strong><span>Loading…</span></article>
      <article class="roll-health-card is-loading"><strong>NQ</strong><span>Loading…</span></article>
    </div>
    <div class="roll-workflow">
      <div class="roll-scan-form">
        <label>Instrument<select id="rollInstrument"><option>ES</option><option>NQ</option></select></label>
        <label>Trade-date scan start<input id="rollScanStart" type="date"></label>
        <label>Trade-date scan end · inclusive<input id="rollScanEnd" type="date"></label>
        <button class="data-button data-button-primary" id="rollScan" type="button">Scan complete sessions</button>
      </div>
      <div class="roll-evidence" id="rollEvidence">No scan evidence yet.</div>
      <div class="roll-confirm-form">
        <label>Evidence status<select id="rollStatus">
          <option value="volume_confirmed">Volume confirmed</option>
          <option value="manual_confirmed">Manual override with scan evidence</option>
        </select></label>
        <label class="roll-note-field">Evidence note<input id="rollNote" maxlength="500" placeholder="Describe the accepted complete-session evidence"></label>
        <button class="data-button" id="rollPreview" type="button" disabled>Preview calendar change</button>
      </div>
      <div class="roll-commit-form">
        <label>Confirmation<input id="rollConfirmation" autocomplete="off" placeholder="Preview first"></label>
        <button class="data-button data-button-danger" id="rollCommit" type="button" disabled>Commit contract roll</button>
      </div>
    </div>
    <p class="write-note">The next raw contract is derived from the validated quarterly chain. The calendar is backed up, hash-checked, atomically replaced, and audited. A boundary already covered by DuckDB is rejected as a historical repair.</p>
  </section>`;
}

function healthCard(item) {
  const card = document.createElement('article');
  const header = document.createElement('div');
  const instrument = document.createElement('strong');
  const state = document.createElement('span');
  const details = document.createElement('dl');
  card.className = `roll-health-card state-${item.state}`;
  instrument.textContent = item.instrument;
  state.className = 'roll-health-state';
  state.textContent = item.state;
  header.append(instrument, state);
  [
    ['Active raw', item.activeContract],
    ['Next transition', `${item.nextOldContract} → ${item.nextNewContract}`],
    ['Hard stop · ET', item.decisionDeadlineEt.replace('T', ' ')],
    ['Last effective · ET', item.lastEffectiveAtEt.replace('T', ' ')],
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
}

export function createRollCalendarPanel(options) {
  const root = options.root;
  const client = options.client;
  const appendOutput = options.appendOutput;
  const setBusy = options.setBusy;
  const signal = options.signal;
  const onCommitted = options.onCommitted ?? (() => {});
  const find = (selector) => root.querySelector(selector);
  const controls = {
    health: find('#rollHealthGrid'),
    instrument: find('#rollInstrument'),
    scanStart: find('#rollScanStart'),
    scanEnd: find('#rollScanEnd'),
    scan: find('#rollScan'),
    evidence: find('#rollEvidence'),
    status: find('#rollStatus'),
    note: find('#rollNote'),
    preview: find('#rollPreview'),
    confirmation: find('#rollConfirmation'),
    commit: find('#rollCommit'),
  };
  let health = [];
  let scanEvidence = null;
  let previewEvidence = null;
  let disposed = false;

  function renderActions() {
    controls.preview.disabled = !scanEvidence;
    controls.commit.disabled = !previewEvidence;
  }

  function selectedHealth() {
    return health.find((item) => item.instrument === controls.instrument.value);
  }

  function resetEvidence(message = 'No scan evidence yet.') {
    scanEvidence = null;
    previewEvidence = null;
    controls.evidence.textContent = message;
    controls.confirmation.value = '';
    controls.confirmation.placeholder = 'Preview first';
    renderActions();
  }

  function applySuggestedWindow() {
    const item = selectedHealth();
    if (!item) return;
    const deadline = item.decisionDeadlineEt.slice(0, 10);
    controls.scanStart.value = shiftIsoDate(deadline, -10);
    controls.scanEnd.value = shiftIsoDate(deadline, 4);
  }

  async function refresh() {
    const result = await client.request({ action: 'roll_health' }, { signal });
    if (!result.ok || !Array.isArray(result.rollHealth)) {
      throw new Error(result.output || 'Roll health returned no structured result.');
    }
    health = result.rollHealth;
    controls.health.replaceChildren(...health.map(healthCard));
    applySuggestedWindow();
    return result;
  }

  async function scan() {
    resetEvidence('Scanning complete CME trade dates…');
    setBusy(true, 'contract roll volume scan running…');
    try {
      const result = await client.runJob({
        action: 'roll_scan_v2',
        instrument: controls.instrument.value,
        scanStart: controls.scanStart.value,
        scanEnd: controls.scanEnd.value,
      }, { signal });
      appendOutput('roll_scan_v2', result);
      scanEvidence = result.rollScan || null;
      if (!scanEvidence) {
        controls.evidence.textContent = 'No candidate from complete trade dates. Nothing can be previewed or committed.';
        return;
      }
      controls.evidence.textContent = `${scanEvidence.oldContract} → ${scanEvidence.newContract} · candidate trade date ${scanEvidence.candidateTradeDate} · effective ${scanEvidence.effectiveAtEt.replace('T', ' ')} ET`;
      renderActions();
    } catch (error) {
      resetEvidence(error.message);
      appendOutput('roll_scan_v2', error.message);
    } finally {
      setBusy(false);
      renderActions();
    }
  }

  async function preview() {
    if (!scanEvidence) return;
    setBusy(true, 'contract roll Preview running…');
    try {
      const result = await client.request({
        action: 'roll_preview_v2',
        scanToken: scanEvidence.token,
        status: controls.status.value,
        note: controls.note.value,
      }, { signal });
      appendOutput('roll_preview_v2', result);
      previewEvidence = result;
      controls.confirmation.placeholder = result.expectedConfirmation;
      controls.evidence.textContent = `${scanEvidence.oldContract} → ${scanEvidence.newContract} is frozen to Preview ${result.previewToken.slice(-8)}. Type ${result.expectedConfirmation} to commit.`;
      renderActions();
    } catch (error) {
      previewEvidence = null;
      renderActions();
      appendOutput('roll_preview_v2', error.message);
    } finally {
      setBusy(false);
      renderActions();
    }
  }

  async function commit() {
    if (!previewEvidence) return;
    setBusy(true, 'atomic contract roll commit running…');
    let result;
    try {
      result = await client.request({
        action: 'roll_commit_v2',
        previewToken: previewEvidence.previewToken,
        confirmText: controls.confirmation.value,
      }, { signal });
      appendOutput('roll_commit_v2', result);
      resetEvidence('Contract roll committed. Prior acquisition gate evidence was revoked.');
    } catch (error) {
      appendOutput('roll_commit_v2', error.message);
      setBusy(false);
      renderActions();
      return;
    }

    // Invalidate all prior acquisition evidence immediately after the commit
    // response. Roll-health and coverage refreshes are post-commit views: they
    // may fail independently, but must never preserve stale write authority.
    let acquisitionRefresh;
    try {
      acquisitionRefresh = onCommitted(result);
    } catch (error) {
      appendOutput('roll_post_commit_invalidation', error.message);
      acquisitionRefresh = undefined;
    }
    const refreshResults = await Promise.allSettled([
      Promise.resolve(acquisitionRefresh),
      refresh(),
    ]);
    refreshResults.forEach((outcome, index) => {
      if (outcome.status === 'rejected') {
        appendOutput(index === 0 ? 'acquisition_status_refresh' : 'roll_health_refresh', outcome.reason?.message || outcome.reason);
      }
    });
    // Keep the committed state visible even if either refresh failed.
    setBusy(false);
    renderActions();
  }

  const listeners = [
    [find('#refreshRollHealth'), 'click', async () => {
      setBusy(true, 'refreshing contract roll health…');
      try { appendOutput('roll_health', await refresh()); } catch (error) { appendOutput('roll_health', error.message); }
      finally { setBusy(false); renderActions(); }
    }],
    [controls.instrument, 'change', () => { resetEvidence(); applySuggestedWindow(); }],
    [controls.scanStart, 'change', () => resetEvidence('Scan range changed. Run Scan again.')],
    [controls.scanEnd, 'change', () => resetEvidence('Scan range changed. Run Scan again.')],
    [controls.status, 'change', () => { previewEvidence = null; renderActions(); }],
    [controls.note, 'input', () => { previewEvidence = null; renderActions(); }],
    [controls.scan, 'click', scan],
    [controls.preview, 'click', preview],
    [controls.commit, 'click', commit],
  ];
  listeners.forEach(([target, event, listener]) => target.addEventListener(event, listener));
  renderActions();

  return Object.freeze({
    refresh,
    renderActions,
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.forEach(([target, event, listener]) => target.removeEventListener(event, listener));
    },
  });
}
