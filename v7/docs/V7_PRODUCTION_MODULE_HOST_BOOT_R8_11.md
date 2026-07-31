# V7 Production ModuleHost Boot — R8.11

Status: completed automated recovery gate (2026-07-31)

## Outcome

Both real HTML production roots now boot through `core.module-host`. The route
entry files load the exact descriptor closure from the architecture manifest,
register real public entries, create one isolated ModuleHost, start it, and ask
that host to stop on `pagehide`. They no longer construct feature stores,
surfaces, providers, or navigation directly.

Two explicit application lifecycle modules own the real browser resources:

- `adapter.session-application` constructs Session persistence/store/settings,
  the optional Replay Workspace surface, navigation, and Session Browser only
  from injected registered public ports;
- `adapter.data-acquisition-application` constructs and disposes the Data
  Acquisition surface from its injected UI port.

Neither module acquires DOM/application resources during definition creation.
Acquisition occurs in `start()` so ModuleHost can call `stop()` and `dispose()`
after a partial later start failure. Cleanup remains idempotent and releases
the Session Browser before the Replay Workspace it consumes.

## Production Descriptor Closure

`app/production-module-catalog.js` reads the committed manifest and each real
`module.json`, selects the transitive required/available-optional closure for
one application root, imports the declared public entries, and creates host
definitions. Dependency entries register public namespaces without creating
application-global state. Only the selected application root owns browser
resource construction.

Replay Workspace remains optional for both Session Browser UI and the Session
application root. Omitting `adapter.replay-workspace-ui` removes it from the
real graph while the Session Browser continues to start with no opened-Session
surface. Omitting a required Session Browser port fails assembly before start.

## Executable Evidence

`tests/production-application-host-browser-harness.js` imports both production
application public entries directly and proves:

- two real Session application hosts start with separate storage and lifecycle
  state;
- stopping one clears only its DOM/resources while the second remains running;
- real application cleanup precedes dependency-port disposal in reverse order;
- a later failing module triggers stop/dispose rollback of the already-started
  real Session application;
- the Session application and Session Browser both receive no Replay Workspace
  port in the removal case;
- the real Data Acquisition application starts and leaves an empty owned root
  after host cleanup;
- required-port omission and post-application start failure both produce their
  declared ModuleHost failure codes.

The existing Session Browser and Data Acquisition production browser Harnesses
also pass without visual or interaction fixture changes.

## Architecture Result

The exact production snapshot now contains 48 modules, 125 actual dependency
edges, 114 cross-module construction sites, seven critical writer sites, two
hosted production roots, and zero blocking production architecture findings.
The two `BUG-V7-0004` findings are closed rather than allowlisted.

H018 returns from `regressed` to `accepted` with its original human acceptance
retained and this production recovery evidence added. Seven recovery rules
remain assigned to R8.12–R8.14. The newly activated H077 production-path rule is
`executable`; its human acceptance remains deliberately deferred.

## Scope Boundary

R8.11 changes application construction and lifecycle ownership only. It adds no
chart API, rendering behavior, interaction, data algorithm, persistence schema,
or feature capability. Source-budget and public-contract closure remain the
exact R8.12 scope.
