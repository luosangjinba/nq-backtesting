export function value(id) {
  return document.getElementById(id).value.trim();
}

export function setValue(id, next) {
  document.getElementById(id).value = next;
}

export function appendOutput(text) {
  const output = document.getElementById('output');
  output.textContent = `${output.textContent}\n\n${text}`.trim();
  requestAnimationFrame(() => {
    output.scrollTop = output.scrollHeight;
  });
}

export function setMaintenanceState(state, kind = '') {
  const pill = document.getElementById('statePill');
  pill.textContent = state;
  pill.className = `pill ${kind}`;
  document.querySelectorAll('button').forEach((button) => {
    if (!['clearOutput', 'copyOutput', 'scrollOutput'].includes(button.id)) {
      button.disabled = button.dataset.permanentlyDisabled === 'true' || state === 'running';
    }
  });
}

export function setStatusPill(state, kind = '') {
  const pill = document.getElementById('statePill');
  pill.textContent = state;
  pill.className = `pill ${kind}`;
}

export function extract(text, pattern) {
  const match = String(text || '').match(pattern);
  return match ? match[1].trim() : '';
}

export function collectLines(text, startsWith) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith(startsWith));
}

export function escapeHtml(nextValue) {
  return String(nextValue ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderEnvironmentStatus(rows = []) {
  const envTable = document.getElementById('envTable');
  if (!envTable) return;
  if (!rows.length) {
    envTable.innerHTML = '<div class="status">No environment status loaded.</div>';
    return;
  }
  envTable.innerHTML = rows.map((row) => `
    <div class="env-row">
      <strong title="${escapeHtml(row.description || '')}">${escapeHtml(row.key)}</strong>
      <span>file: ${escapeHtml(row.fileMasked || 'unknown')}</span>
      <span>API: ${escapeHtml(row.processMasked || 'unknown')}${row.requiresRestart ? ' - restart' : ''}</span>
    </div>
  `).join('');
}

export function bindOutputControls() {
  const output = document.getElementById('output');
  document.getElementById('clearOutput').addEventListener('click', () => {
    output.textContent = 'Ready.';
    setMaintenanceState('idle');
  });
  document.getElementById('scrollOutput').addEventListener('click', () => {
    output.scrollTop = output.scrollHeight;
  });
  document.getElementById('copyOutput').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(output.textContent);
      setMaintenanceState('copied', 'ok');
    } catch (error) {
      appendOutput(`copy failed: ${error.message}`);
      setMaintenanceState('failed', 'fail');
    }
  });
}

export function summarize(payload, data, responseStatus) {
  const out = data.output || data.error || '';
  const lines = [];
  const ok = Boolean(data.ok);
  lines.push(ok ? 'Result: completed.' : `Result: needs attention. HTTP/return status ${data.returncode ?? responseStatus}.`);
  if (data.parseError) lines.push(data.parseError);
  if (data.error && !data.parseError && !ok) lines.push(`Error: ${data.error}`);

  if (payload.action === 'environment_status' || payload.action === 'environment_write' || payload.action === 'environment_delete') {
    const file = extract(out, /^file:\s*(.+)$/m);
    const exists = extract(out, /^file_exists:\s*(.+)$/m);
    const updated = extract(out, /^updated_key:\s*(.+)$/m);
    if (file) lines.push(`Local environment file: ${file}.`);
    if (exists) lines.push(`File exists: ${exists}.`);
    if (updated) lines.push(`Updated variable: ${updated}.`);
    if (payload.action === 'environment_write') {
      lines.push('Value saved to .env.local and applied to the current API process.');
      lines.push('Variables marked restart still require a service restart for full effect.');
    }
  } else if (payload.action === 'api_restart') {
    const status = extract(out, /^api_restart_status:\s*(.+)$/m);
    const delay = extract(out, /^restart_delay_seconds:\s*(.+)$/m);
    const activeProcess = extract(out, /^active_maintenance_process:\s*(.+)$/m);
    lines.push(`API restart status: ${status || 'unknown'}.`);
    if (activeProcess && activeProcess !== 'none') {
      lines.push(`Active maintenance process was ${activeProcess} before restart.`);
    }
    if (delay) lines.push(`Restart will begin in about ${delay} seconds.`);
    lines.push('Refresh or run Environment Status again after a few seconds.');
  } else if (payload.action === 'dry_run' || payload.action === 'write') {
    const instrument = extract(out, /^instrument:\s*(.+)$/m) || payload.instrument;
    const dbMax = extract(out, /^db_max_ts:\s*(.+)$/m);
    const requested = extract(out, /^dry_run_range_et:\s*(.+)$/m);
    const dataEnd = extract(out, /^databento_end_et:\s*(.+)$/m);
    const downloaded = extract(out, /^downloaded_normalized_rows:\s*(.+)$/m);
    const duplicates = extract(out, /^duplicate_candidate_keys:\s*(.+)$/m);
    const existing = extract(out, /^existing_candidate_keys:\s*(.+)$/m);
    const wouldInsert = extract(out, /^would_insert_rows:\s*(.+)$/m);
    const first = extract(out, /^would_insert_first_ts:\s*(.+)$/m);
    const last = extract(out, /^would_insert_last_ts:\s*(.+)$/m);
    const inserted = extract(out, /^inserted_rows:\s*(.+)$/m);
    const afterMax = extract(out, /^after_max_ts:\s*(.+)$/m);
    if (instrument) lines.push(`Instrument: ${instrument}.`);
    if (dbMax) lines.push(`Current DB latest bar before this run: ${dbMax}.`);
    if (requested) lines.push(`Actual checked range: ${requested}.`);
    if (dataEnd) lines.push(`Databento available end used by the updater: ${dataEnd}.`);
    if (downloaded) lines.push(`Downloaded normalized rows: ${downloaded}.`);
    if (wouldInsert === '0') {
      lines.push('No new rows would be inserted.');
      if (/weekend/i.test(out)) {
        lines.push('Reason: the checked range falls in a weekend/no-trading window.');
      } else if (/No data found/i.test(out)) {
        lines.push('Reason: Databento returned no bars for the checked range.');
      }
    } else if (wouldInsert) {
      lines.push(`Rows that would be inserted: ${wouldInsert}.`);
      if (first && last) lines.push(`Candidate insert range: ${first} -> ${last}.`);
    }
    if (duplicates) lines.push(`Duplicate candidate keys: ${duplicates}.`);
    if (existing) lines.push(`Existing candidate keys already in DB: ${existing}.`);
    if (inserted) lines.push(`Rows inserted: ${inserted}.`);
    if (afterMax) lines.push(`DB latest bar after write: ${afterMax}.`);
    const warnings = collectLines(out, '- The streaming request').length + collectLines(out, '- No data found').length;
    if (warnings) lines.push(`Databento warnings: ${warnings}. Review Raw Output before writing.`);
  } else if (payload.action === 'preflight') {
    const status = extract(out, /^preflight_status:\s*(.+)$/m);
    if (status === 'write-eligible') {
      lines.push('The selected range is write-eligible.');
    } else if (status === 'blocked') {
      lines.push('The selected range is blocked. Do not dry-run/write across this range yet.');
      const blocked = extract(out, /^blocked_segments:\s*(.+)$/m);
      if (blocked) lines.push(`Blocked segments: ${blocked}.`);
    }
  } else if (payload.action === 'roll_report') {
    const count = extract(out, /^reported_entries:\s*(.+)$/m);
    lines.push(count === '0' ? 'No roll entries currently need attention.' : `Roll entries needing attention: ${count || 'unknown'}.`);
  } else if (payload.action === 'roll_scan_volume') {
    const oldTotal = extract(out, /^old_total_volume:\s*(.+)$/m);
    const newTotal = extract(out, /^new_total_volume:\s*(.+)$/m);
    const overtake = extract(out, /^first_new_overtake_date:\s*(.+)$/m);
    const consecutive = extract(out, /^first_consecutive_new_dominance_date:\s*(.+)$/m);
    const candidate = extract(out, /^candidate_roll_date:\s*(.+)$/m);
    const candidateStatus = extract(out, /^candidate_status:\s*(.+)$/m);
    if (oldTotal) lines.push(`Old contract total volume: ${oldTotal}.`);
    if (newTotal) lines.push(`New contract total volume: ${newTotal}.`);
    if (overtake) lines.push(`First new-contract overtake date: ${overtake}.`);
    if (consecutive) lines.push(`First consecutive new-dominance date: ${consecutive}.`);
    if (candidate && candidate !== 'n/a') {
      lines.push(`Candidate roll date: ${candidate}. Use Candidate Date can fill Roll date.`);
    } else {
      lines.push('No candidate roll date was detected.');
    }
    if (candidateStatus) lines.push(`Candidate status: ${candidateStatus}.`);
  } else if (payload.action === 'confirm_roll_preview') {
    lines.push('Preview only. No calendar file was changed.');
    if (/^\+/m.test(out) || /^-/m.test(out)) lines.push('Review the diff in Raw Output before using Write Confirm.');
  } else if (payload.action === 'confirm_roll_write') {
    const writeStatus = extract(out, /^write_status:\s*(.+)$/m);
    lines.push(writeStatus === 'written' ? 'Roll calendar confirmation was written.' : `Write status: ${writeStatus || 'unknown'}.`);
  } else if (payload.action === 'verify' || payload.action === 'verify_api') {
    const hard = extract(out, /^hard_errors:\s*(.+)$/m);
    const warnings = extract(out, /^warnings:\s*(.+)$/m);
    const status = extract(out, /^data_freshness_status:\s*(.+)$/m);
    lines.push(`Freshness status: ${status || 'unknown'}; hard errors: ${hard || 'unknown'}; warnings: ${warnings || 'unknown'}.`);
  } else if (payload.action === 'api_smoke') {
    const returned = extract(out, /^returned_bars:\s*(.+)$/m);
    const dbMax = extract(out, /^db_max_ts:\s*(.+)$/m);
    lines.push(`API returned bars: ${returned || 'unknown'}; DB latest: ${dbMax || 'unknown'}.`);
  } else if (payload.action === 'economic_status' || payload.action === 'economic_verify') {
    const status = extract(out, /^economic_calendar_verify_status:\s*(.+)$/m);
    const rows = extract(out, /^rows:\s*(.+)$/m);
    const minDate = extract(out, /^date_min:\s*(.+)$/m);
    const maxDate = extract(out, /^date_max:\s*(.+)$/m);
    const duplicates = extract(out, /^duplicate_keys:\s*(.+)$/m);
    const malformed = extract(out, /^malformed_rows:\s*(.+)$/m);
    lines.push(`Economic calendar status: ${status || 'unknown'}; rows: ${rows || 'unknown'}; range: ${minDate || 'unknown'} -> ${maxDate || 'unknown'}.`);
    lines.push(`Duplicate keys: ${duplicates || 'unknown'}; malformed rows: ${malformed || 'unknown'}.`);
  } else if (
    payload.action === 'economic_dry_run' ||
    payload.action === 'economic_write' ||
    payload.action === 'economic_manual_preview' ||
    payload.action === 'economic_manual_write'
  ) {
    const existingMax = extract(out, /^existing_date_max:\s*(.+)$/m) || extract(out, /^date_max_before:\s*(.+)$/m);
    const requested = extract(out, /^requested_range:\s*(.+)$/m);
    const months = extract(out, /^months:\s*(.+)$/m);
    const candidateRows = extract(out, /^candidate_rows:\s*(.+)$/m);
    const wouldAppend = extract(out, /^would_append_rows:\s*(.+)$/m);
    const appended = extract(out, /^appended_rows:\s*(.+)$/m);
    const skippedOverlap = extract(out, /^skipped_overlap_rows:\s*(.+)$/m) || extract(out, /^overlap_new_keys:\s*(.+)$/m);
    const skippedCurrency = extract(out, /^skipped_currency_rows:\s*(.+)$/m);
    const duplicateCandidate = extract(out, /^duplicate_candidate_keys:\s*(.+)$/m);
    const afterMax = extract(out, /^date_max_after:\s*(.+)$/m);
    if (existingMax) lines.push(`Current economic calendar latest date: ${existingMax}.`);
    if (requested) lines.push(`Requested range: ${requested}.`);
    if (months) lines.push(`Months involved: ${months}.`);
    if (candidateRows) lines.push(`Candidate rows: ${candidateRows}.`);
    if (duplicateCandidate) lines.push(`Duplicate candidate keys: ${duplicateCandidate}.`);
    if (wouldAppend) lines.push(`Rows that would be appended: ${wouldAppend}.`);
    if (appended) lines.push(`Rows appended: ${appended}.`);
    if (skippedOverlap) lines.push(`Skipped overlap rows: ${skippedOverlap}.`);
    if (skippedCurrency) lines.push(`Skipped non-matching currency rows: ${skippedCurrency}.`);
    if (afterMax) lines.push(`Economic calendar latest date after write: ${afterMax}.`);
  }

  return lines.join('\n');
}

export function formatResult(payload, data, responseStatus, header, requestUrl) {
  const raw = data.output || data.error || '';
  const diagnostics = [
    data.parseError ? `parse_error: ${data.parseError}` : '',
    data.error && data.error !== data.parseError ? `error: ${data.error}` : '',
  ].filter(Boolean).join('\n');
  return [
    header,
    `action=${payload.action || 'unknown'}`,
    `url=${requestUrl}`,
    `http_status=${responseStatus}`,
    '',
    'Summary',
    '-------',
    summarize(payload, data, responseStatus),
    '',
    'Raw Output',
    '----------',
    diagnostics,
    raw,
  ].filter((line, index, lines) => line !== '' || lines[index - 1] !== '').join('\n');
}
