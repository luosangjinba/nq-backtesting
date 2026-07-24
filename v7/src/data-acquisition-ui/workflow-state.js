function normalizeSelection(input) {
  const instrument = String(input?.instrument ?? '').trim().toUpperCase();
  const start = String(input?.start ?? '').trim();
  const end = String(input?.end ?? '').trim();
  const chunkDays = Number(input?.chunkDays);
  if (!['ES', 'NQ'].includes(instrument)) throw new TypeError('Instrument must be ES or NQ.');
  if (!start || !end) throw new TypeError('Start and end are required.');
  if (!Number.isInteger(chunkDays) || chunkDays < 1 || chunkDays > 30) {
    throw new TypeError('Chunk days must be an integer from 1 to 30.');
  }
  return Object.freeze({ instrument, start, end, chunkDays });
}

function selectionKey(selection) {
  return JSON.stringify(selection);
}

export function parseOutputMetric(output, name) {
  const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(output ?? '').match(new RegExp(`^${escaped}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim() : '';
}

function isSuccessfulResult(result) {
  return result?.ok === true && Number(result?.returncode ?? 0) === 0;
}

function normalizeWallMinute(value) {
  const match = String(value ?? '').trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::\d{2})?$/);
  return match ? `${match[1]}T${match[2]}` : '';
}

function parseEffectiveDryRunRange(output) {
  const raw = parseOutputMetric(output, 'dry_run_range_et');
  const match = raw.match(/^(.+?)\s+->\s+(.+?)\s+\(exclusive\)$/);
  if (!match) return null;
  const start = normalizeWallMinute(match[1]);
  const end = normalizeWallMinute(match[2]);
  return start && end ? Object.freeze({ start, end }) : null;
}

export function createAcquisitionWorkflow(initialSelection) {
  let selection = normalizeSelection(initialSelection);
  let preflightKey = null;
  let dryRunKey = null;
  let dryRunSummary = null;
  let backupKey = null;
  let cleanCoverage = new Set();

  function coverageAccepted() {
    return cleanCoverage.has(selection.instrument);
  }

  function clearGateEvidence() {
    preflightKey = null;
    dryRunKey = null;
    dryRunSummary = null;
    backupKey = null;
  }

  function snapshot() {
    const key = selectionKey(selection);
    return Object.freeze({
      selection,
      coverageAccepted: coverageAccepted(),
      preflightAccepted: preflightKey === key,
      dryRunAccepted: dryRunKey === key,
      dryRunSummary,
      backupAccepted: backupKey === key,
      canWrite: coverageAccepted() && preflightKey === key && dryRunKey === key && backupKey === key,
      expectedConfirmation: `WRITE ${selection.instrument}`,
    });
  }

  return Object.freeze({
    updateSelection(nextSelection) {
      const next = normalizeSelection(nextSelection);
      if (selectionKey(next) !== selectionKey(selection)) {
        selection = next;
        clearGateEvidence();
      }
      return snapshot();
    },
    recordCoverage(items) {
      cleanCoverage = new Set((Array.isArray(items) ? items : [])
        .filter((item) => ['ES', 'NQ'].includes(item?.instrument)
          && item.integrity === 'ok'
          && Number(item.duplicateTimestamps) === 0)
        .map((item) => item.instrument));
      if (!coverageAccepted()) clearGateEvidence();
      return snapshot();
    },
    recordPreflight(result) {
      const accepted = coverageAccepted()
        && isSuccessfulResult(result)
        && parseOutputMetric(result.output, 'preflight_status') === 'write-eligible';
      preflightKey = accepted ? selectionKey(selection) : null;
      dryRunKey = null;
      dryRunSummary = null;
      backupKey = null;
      return snapshot();
    },
    recordDryRun(result) {
      const duplicateKeys = Number(parseOutputMetric(result?.output, 'duplicate_candidate_keys'));
      const wouldInsert = Number(parseOutputMetric(result?.output, 'would_insert_rows'));
      const effectiveRange = parseEffectiveDryRunRange(result?.output);
      const dryRunMarker = /dry[- ]run/i.test(String(result?.output ?? ''));
      const selectedStart = normalizeWallMinute(selection.start);
      const selectedEnd = normalizeWallMinute(selection.end);
      const accepted = preflightKey === selectionKey(selection)
        && isSuccessfulResult(result)
        && dryRunMarker
        && Number.isFinite(duplicateKeys)
        && duplicateKeys === 0
        && Number.isFinite(wouldInsert)
        && wouldInsert >= 0
        && effectiveRange?.start === selectedStart
        && effectiveRange.end > effectiveRange.start
        && effectiveRange.end <= selectedEnd;
      dryRunKey = accepted ? selectionKey(selection) : null;
      dryRunSummary = accepted ? Object.freeze({
        duplicateKeys,
        wouldInsert,
        effectiveStart: effectiveRange.start,
        effectiveEnd: effectiveRange.end,
      }) : null;
      backupKey = null;
      return snapshot();
    },
    recordBackup(result) {
      const accepted = dryRunKey === selectionKey(selection)
        && isSuccessfulResult(result)
        && parseOutputMetric(result?.output, 'backup_status') === 'ok'
        && parseOutputMetric(result?.output, 'restore_smoke_status') === 'ok';
      backupKey = accepted ? selectionKey(selection) : null;
      return snapshot();
    },
    assertWriteAllowed(confirmText) {
      const current = snapshot();
      if (!current.canWrite) {
        throw new Error('Run Preflight, Dry Run, and verified Backup for the unchanged range before writing.');
      }
      if (String(confirmText ?? '').trim() !== current.expectedConfirmation) {
        throw new Error(`Type ${current.expectedConfirmation} exactly to enable the insert-only write.`);
      }
      return current.selection;
    },
    clearEvidence() {
      clearGateEvidence();
      return snapshot();
    },
    snapshot,
  });
}
