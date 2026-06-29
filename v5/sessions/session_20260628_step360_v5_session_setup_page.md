# Step 360 - V5 Session Setup Page

## Goal

Build the FX Replay session setup page on top of the Step 359 session runtime.

This step creates replay session metadata and navigates to the chart route by
session id. It does not load K-line data, initialize chart runtime, or start
replay behavior.

## Completed

### Step 360.1 - Setup Form

- Replaced setup placeholder with an instrument/timeframe/start/end form.
- Added form styling.
- Kept create action disabled until validation/create wiring existed.

Commit: `d642dbd Add V5 session setup form`

### Step 360.2 - Validation

- Added `v5/src/features/session-setup/session-setup-model.js`.
- Validates:
  - instrument is present;
  - timeframe is a positive integer;
  - start/end are valid datetimes;
  - start is before end.
- Added `v5/tests/session-setup-model-smoke.js`.

Commit: `802a189 Add V5 session setup validation`

### Step 360.3 - Create And Navigate

- Setup route now dispatches `session.create`.
- Successful create dispatches `app.navigate` to chart route with only
  `sessionId`.
- Router now supports route params.
- Chart route displays selected session id but still has no chart runtime.

Commit: `ed4ccee Wire V5 setup form to session commands`

### Step 360.4 - Browser Smoke

- Added `v5/tests/session-setup-browser-smoke.js`.
- Browser smoke submits the setup form and verifies:
  - chart route opens;
  - chart route receives a generated session id;
  - no chart runtime exists;
  - no bars runtime exists;
  - no replay runtime exists.
- Added setup model/browser smoke to `v5/scripts/smoke_all.js`.

## Checks

- `node v5/tests/session-setup-model-smoke.js`
- `node v5/tests/session-setup-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Manual Acceptance

- Setup page has instrument/timeframe/start/end controls.
- Submit creates session metadata.
- Submit navigates to chart route.
- Chart route receives only `sessionId`.
- No K-line range is requested.
- No chart runtime is initialized.
- No replay runtime is initialized.

## Next Step

Step 361 should add chart runtime foundation as the only chart writer.

Do not add bars loading or replay semantics in Step 361.

