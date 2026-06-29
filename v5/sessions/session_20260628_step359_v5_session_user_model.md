# Step 359 - V5 Session And User Model

## Goal

Add default-user session persistence APIs and frontend session state without
adding chart, bars, or replay behavior.

## Completed

### Step 359.1 - Domain Model

- Added `v5/src/domain/session-model.js`.
- Added schemas/normalizers for:
  - users;
  - workspaces;
  - replay sessions;
  - replay cursors.
- Added ownership assertions for user/workspace/session relationships.

Commit: `001ce82 Add V5 session domain model`

### Step 359.2 - Default Workspace Bootstrap

- Added `v5/src/domain/default-workspace.js`.
- Added default user and workspace constants.
- Added bootstrap helper that always binds workspace to the selected user.

Commit: `b10e6a8 Add V5 default workspace bootstrap`

### Step 359.3 - Replay Session Repository

- Added `v5/src/session/session-repository.js`.
- Added create/list/get replay session API.
- Session creation forces default user/workspace ownership.
- Session creation creates a matching replay cursor.
- No K-line loading is performed.

Commit: `c17f36a Add V5 replay session repository`

### Step 359.4 - Session Runtime Commands

- Added `v5/src/runtime/session-runtime.js`.
- Registered command contract:
  - `session.getContext`
  - `session.create`
  - `session.list`
  - `session.get`
- Added `session:created` event.
- Wired session runtime into the V5 app shell.

Commit: `e504107 Add V5 session runtime commands`

### Step 359.5 - Persistence Smoke

- Added `v5/src/session/session-storage.js`.
- Added memory and localStorage-compatible storage adapters.
- Repository now loads/saves session snapshots through a storage adapter.
- Added persistence smoke proving a new repository instance can read a created
  session from storage.
- Expanded V5 smoke runner to include session model/runtime/persistence checks.
- Expanded boundary smoke so feature modules cannot import session repository or
  session storage directly.

## Checks

- `node v5/tests/session-model-smoke.js`
- `node v5/tests/default-workspace-smoke.js`
- `node v5/tests/session-repository-smoke.js`
- `node v5/tests/session-runtime-smoke.js`
- `node v5/tests/session-persistence-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Manual Acceptance

- Replay sessions can be created by API/runtime command.
- Created sessions can be listed and loaded by id.
- Created sessions are scoped to default user/workspace.
- Replay cursor exists with the session.
- No chart runtime exists yet.
- No bars runtime exists yet.
- No replay loading exists yet.
- UI/features do not write session repository state directly.

## Next Step

Step 360 should build the Session Setup page on top of the session runtime
commands.

The setup page should create sessions and navigate to chart route by session id,
but it must not load chart data or K-line ranges.

