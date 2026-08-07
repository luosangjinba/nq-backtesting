/** Pure markup factory for the optional first-database workflow. */
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
        <button class="data-button" id="databaseDiscard" type="button"
          aria-controls="databaseFile databaseValidationReport" aria-expanded="false" hidden>Upload another file</button>
      </div>
      <div class="database-progress" id="databaseProgress" hidden>
        <div><span id="databaseProgressBar"></span></div><strong id="databaseProgressText">0%</strong>
      </div>
      <div class="database-reupload-confirmation" id="databaseDiscardConfirmation"
        role="group" aria-labelledby="databaseDiscardMessage" hidden>
        <p id="databaseDiscardMessage">Discard the current staged file?</p>
        <div>
          <button class="data-button" id="databaseDiscardCancel" type="button">Keep current file</button>
          <button class="data-button data-button-danger" id="databaseDiscardConfirm" type="button">Discard and choose another</button>
        </div>
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
