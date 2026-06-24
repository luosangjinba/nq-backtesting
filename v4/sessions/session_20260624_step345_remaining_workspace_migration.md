# Step 345 - Remaining Workspace Migration and Multi-User Readiness

## Goal

Continue migrating user-private browser-local domains to the default-user server workspace while keeping localStorage and Review JSON fallback intact.

## Step 345.1 - Migrate Segments and Segment Groups

Status: complete.

Workspace domain:

```text
market-segments
```

Scope:

```text
instrument-scoped
```

Payload:

```json
{
  "version": 2,
  "savedAt": 1780000000000,
  "instrument": "NQ",
  "segments": [],
  "segmentGroups": []
}
```

Implemented:

- Added `market-segments` as an instrument-scoped workspace domain.
- Wrapped `segment-persistence.js` with localStorage-first, server best-effort sync.
- Preserved existing payload shape: `segments` plus `segmentGroups`.
- Preserved Composite Move group relationships through `childSegmentIds`.
- Preserved segment PDA response refs inside segment payloads.
- Existing Review JSON export/import remains unchanged.

Validation:

```bash
python3 v4/tests/workspace-api-smoke.py
node v4/tests/segment-persistence-smoke.js
```

## Step 345.2 - Migrate Order Setup and Live Records

Status: pending.

## Step 345.3 - Migrate Notes and Review Domains

Status: pending.

## Step 345.4 - Migrate Preferences/History by Policy

Status: pending.

## Step 345.5 - Add Import Batch Audit

Status: pending.

## Step 345.6 - Multi-User Login Readiness Review

Status: pending.

## Step 345.7 - Security Hardening Gate

Status: pending.
