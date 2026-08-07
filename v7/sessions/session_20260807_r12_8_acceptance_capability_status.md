# Session — R12.8 Acceptance Capability-Aware Status

Date: 2026-08-07

## Trigger

The second acceptance pass otherwise passed, but an existing-database cloud
deployment showed the first-run importer as unavailable and treated the
intentionally disabled optional Maintenance API as a database failure. The
automated browser pass also exposed a raw Replay error code.

## Decision

- keep first-run import, optional maintenance, and read-only market data as
  independent capabilities;
- expose only importer health after a database exists and retain every importer
  mutation lock;
- fall back to the V7 Market Data read boundary for honest ES/NQ range status;
- hide unavailable maintenance-only controls instead of rendering expected
  403/404 responses as red product failures;
- translate internal Replay failure codes inside the Replay UI adapter;
- split coverage orchestration from the Data Acquisition surface entry before
  adding the behavior.

## Implementation

- add full/health-only private proxy modes and exact existing-database Caddy
  health routing;
- preserve HTTP status/code on non-JSON bootstrap responses;
- add a read-only coverage client and focused coverage status controller;
- render `Read-only data ready`, lock the active database panel, and hide
  Contract Roll/write workflow/activity without claiming maintenance integrity;
- add Replay workspace user-copy mapping for known and unknown internal codes;
- inventory the new proxy route and update architecture, deployment, bootstrap,
  user, roadmap, TODO, numbering, and restart documentation.

## Automated Evidence

- Data Acquisition unit and real-browser Harnesses — pass;
- Database Bootstrap and Database Import browser Harnesses — pass;
- Linux deployment Harness — pass;
- Replay Workspace UI independent Harness — pass;
- Production Architecture, Source Quality, Deployed Runtime Architecture, and
  Standalone Runtime — pass after evidence refresh;
- shell/JavaScript syntax, JSON validation, and `git diff --check` — pass.

## Human Gate

Redeploy the existing-database acceptance host and hard-refresh Data
Acquisition. Accept only when it shows `Database active`, `Read-only data
ready`, and ES/NQ ranges with no false importer/maintenance failure. The user's
second-round result already accepts every other listed item; this focused cloud
rerun remains open.
