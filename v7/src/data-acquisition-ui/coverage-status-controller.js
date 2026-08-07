function createCoverageCard(item, readOnly) {
  const card = document.createElement('article');
  const header = document.createElement('div');
  const instrument = document.createElement('strong');
  const integrity = document.createElement('span');
  const details = document.createElement('dl');
  card.className = `coverage-card${readOnly ? ' is-read-only' : item.integrity === 'ok' ? '' : ' has-error'}`;
  instrument.textContent = item.instrument;
  integrity.className = 'coverage-integrity';
  integrity.textContent = readOnly ? 'read-only' : item.integrity;
  header.append(instrument, integrity);
  const metrics = readOnly ? [
    ['First', item.firstTimestamp || 'No data'],
    ['Latest', item.latestTimestamp || 'No data'],
    ['Market dates', new Intl.NumberFormat('en-US').format(Number(item.marketDateCount) || 0)],
    ['Duplicates', 'Maintenance check disabled'],
  ] : [
    ['Latest', item.latestTimestamp || 'No data'],
    ['Age', `${item.ageHours ?? '—'} hours`],
    ['Rows', new Intl.NumberFormat('en-US').format(Number(item.rows) || 0)],
    ['Duplicates', new Intl.NumberFormat('en-US').format(Number(item.duplicateTimestamps) || 0)],
  ];
  for (const [label, value] of metrics) {
    const row = document.createElement('div');
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    row.append(term, description);
    details.append(row);
  }
  card.append(header, details);
  return card;
}

/** Own capability-aware maintenance and read-only market coverage presentation. */
export function createCoverageStatusController(options) {
  const {
    appendOutput, maintenanceClient, onCoverage, onResetStart,
    readOnlyCoverageClient, root, signal,
  } = options;
  let coverage = new Map();
  let maintenanceAvailable = null;
  const find = (selector) => root.querySelector(selector);

  function setMaintenanceAvailable(available) {
    maintenanceAvailable = available;
    root.dataset.maintenanceAvailable = String(available);
    for (const id of ['rollCalendarSection', 'maintenanceWorkflowSection', 'maintenanceActivitySection']) {
      find(`#${id}`).hidden = !available;
    }
  }

  function renderCoverage(items, { readOnly = false } = {}) {
    coverage = new Map(items.map((item) => [item.instrument, item]));
    find('#coverageGrid').replaceChildren(...items.map((item) => createCoverageCard(item, readOnly)));
    find('#coverageCopy').textContent = readOnly
      ? 'Active DuckDB range from the read-only V7 market-data service. Maintenance integrity checks are disabled.'
      : 'Read-only DuckDB state. Duplicate timestamps are a hard stop.';
    onCoverage(readOnly ? [] : items);
  }

  async function refresh({ resetStart = false } = {}) {
    const service = find('#serviceState');
    try {
      const coverageResult = await maintenanceClient.request(
        { action: 'coverage_status' },
        { signal, acceptErrorResult: true },
      );
      const environmentResult = await maintenanceClient.request(
        { action: 'environment_status' },
        { signal },
      );
      if (!Array.isArray(coverageResult.coverage)) {
        throw new Error(coverageResult.output || 'Coverage check returned no structured result.');
      }
      setMaintenanceAvailable(true);
      renderCoverage(coverageResult.coverage);
      const apiKey = environmentResult.environment?.find((row) => row.key === 'DATABENTO_API_KEY');
      const database = environmentResult.environment?.find((row) => row.key === 'V7_MARKET_DATA_DB');
      find('#environmentStrip').textContent = `Databento: ${apiKey?.processSet ? 'configured in API process' : 'not configured'} · Database override: ${database?.processSet ? 'active' : 'default path'} · API: ${maintenanceClient.apiBase || 'same origin'}`;
      service.dataset.state = coverageResult.ok ? 'ready' : 'error';
      service.querySelector('strong').textContent = coverageResult.ok
        ? 'Maintenance API ready'
        : 'Coverage integrity failed';
      if (!coverageResult.ok) appendOutput('coverage', coverageResult);
      if (resetStart) onResetStart();
      return Object.freeze({ maintenanceAvailable: true });
    } catch (error) {
      if (signal.aborted) throw error;
      setMaintenanceAvailable(false);
      try {
        const readOnlyStatus = await readOnlyCoverageClient.read({ signal });
        renderCoverage(readOnlyStatus.coverage, { readOnly: true });
        service.dataset.state = 'read-only';
        service.querySelector('strong').textContent = 'Read-only data ready';
        find('#environmentStrip').textContent = 'Market database: active and readable · First-run upload: locked · Optional maintenance: not enabled';
        if (resetStart) onResetStart();
      } catch (readError) {
        if (signal.aborted) throw readError;
        onCoverage([]);
        service.dataset.state = 'error';
        service.querySelector('strong').textContent = 'Market data unavailable';
        const card = document.createElement('article');
        const title = document.createElement('strong');
        const detail = document.createElement('span');
        card.className = 'coverage-card has-error';
        title.textContent = 'Unavailable';
        detail.textContent = readError.message;
        card.append(title, detail);
        find('#coverageGrid').replaceChildren(card);
        find('#environmentStrip').textContent = 'The active market database could not be read. Check the V7 market-data service and retry.';
        appendOutput('status', readError.message);
      }
      return Object.freeze({ maintenanceAvailable: false });
    }
  }

  return Object.freeze({
    latestTimestamp(instrument) { return coverage.get(instrument)?.latestTimestamp ?? null; },
    maintenanceAvailable() { return maintenanceAvailable; },
    refresh,
  });
}
