# Session: Step 334 Remote Data Maintenance and Responsive UX Hardening

Date: 2026-06-23

## Trigger

After Step 333, the V4 server URL can be opened from another computer:

```text
http://192.168.1.111:8001/index.html
```

User feedback from the remote computer:

- The page can be loaded.
- K-line data import cannot be completed.
- No useful error message is shown.
- The UI does not adapt well to different screen resolutions.

## Goal

Make remote server use operationally clear:

- Remote Data Maintenance/import actions must either work or explain why they cannot work.
- Failures must be visible and copyable.
- The main V4 page and Data Maintenance page must remain usable at common desktop/laptop widths.

## Non-Goals

- Do not build full workspace/localStorage sync in this step.
- Do not expose the server to the public internet.
- Do not redesign the entire app layout.
- Do not move every local archive/import workflow server-side unless it is required to resolve the K-line import failure.

## Step 334.1 Remote Import Workflow Audit

Questions to answer:

- Which UI did the user call "import K-line data"?
  - Data Maintenance refresh/import action.
  - A browser file input.
  - A script-backed Databento refresh.
  - Another historical CSV import path.
- Does that workflow write to server-side `V4_TRADING_DB`?
- Does it depend on files located on the client computer?
- Does it require a backend script or API endpoint that is not currently exposed remotely?
- Does the failure appear in:
  - browser console;
  - Network panel;
  - `data-maintenance.html` Output;
  - `v4/.api.log`;
  - script stdout/stderr?

Deliverable:

- A short audit note in this session identifying the exact failing workflow and current expected behavior.

Acceptance:

- The failure is reproducible or classified as "needs user-provided file/steps".
- The code path and user-facing gap are known before implementation.

## Step 334.2 Data Maintenance Error Visibility

Required behavior:

- Every action shows a visible pending state.
- Every failure writes a clear message into Output.
- Output includes enough detail to debug:
  - action name;
  - request URL;
  - HTTP status;
  - response body if available;
  - backend stdout/stderr if returned;
  - browser fetch/CORS error text if available.
- Copy/Latest output remains useful after failure.
- No button should fail silently.

Likely files:

- `v4/data-maintenance.html`
- `v4/v4_api.py`
- Data maintenance tests or browser smoke under `v4/tests/`

Acceptance:

- Simulated backend failure displays an error in Output.
- Simulated network/API failure displays an error in Output.
- Existing successful actions still display success.

## Step 334.3 Server-Side K-Line Import Contract

Decision point:

If the current K-line import is intended to be remote-capable:

- Add or fix the server-side endpoint/action needed to write the server DB.
- Ensure the action uses `V4_TRADING_DB`.
- Ensure file upload or server-side file path handling is explicit and safe.
- Return structured stdout/stderr/status to the browser.

If the current K-line import is not intended to be remote-capable yet:

- Disable or label it clearly in the remote UI.
- Explain the supported alternative:
  - run a server-side refresh command;
  - place files on the server and run a script;
  - use Data Maintenance dry-run/write actions if available.

Acceptance:

- Remote users are not left guessing whether import is broken, unsupported, or still running.
- The UI communicates the supported path for updating K-line data.

## Step 334.4 Responsive Layout Baseline

Target viewports:

- Large desktop: `1920x1080`.
- Laptop: `1366x768`.
- Narrow desktop/tablet-like width: `1024x768`.

Main page requirements:

- Toolbar controls wrap or compress without overlapping.
- Chart remains visible and usable.
- Inspector does not make the chart unusable on narrow widths.
- Comparison Window, if open, respects a minimum usable width.
- Replay bar controls remain visible or scrollable without covering the chart.

Data Maintenance requirements:

- Operation buttons remain reachable.
- Output panel remains visible or moves below controls on narrow widths.
- File inputs and action buttons do not overflow their containers.
- Status/error text remains readable.

Acceptance:

- Browser smoke or screenshots confirm the key controls are visible/clickable at the target widths.
- No obvious horizontal overflow for the primary workflow surfaces.

## Step 334.5 Remote Browser Smoke Coverage

Add or extend browser smoke to cover LAN/server URL behavior.

Suggested checks:

- Load `http://192.168.1.111:8001/index.html`.
- Confirm browser-side API calls target `192.168.1.111:8766`.
- Load `http://192.168.1.111:8001/data-maintenance.html`.
- Trigger one safe dry-run action or mocked failing action.
- Confirm Output displays success or failure.
- Run at two viewport widths:
  - `1366x768`;
  - `1024x768`.

Acceptance:

- Smoke fails if the remote page calls `127.0.0.1:8766`.
- Smoke fails if a Data Maintenance failure is silent.
- Smoke fails if required controls are not visible/clickable at target widths.

## Step 334.6 Docs and Closeout

Update:

- `v4/TODO.md`
- this session file
- server sync runbook if operation rules change

Closeout should record:

- Whether remote K-line import is supported now.
- If not supported, the exact supported alternative.
- What errors are now surfaced.
- Which viewport widths were verified.
- Remaining UX limitations.
- Recommended Step 335.

## Recommended Implementation Order

1. Reproduce/audit the remote import failure.
2. Fix error visibility first, before changing import behavior.
3. Decide and implement the K-line import contract.
4. Apply responsive CSS/layout fixes.
5. Add remote browser smoke.
6. Update docs and close out.

