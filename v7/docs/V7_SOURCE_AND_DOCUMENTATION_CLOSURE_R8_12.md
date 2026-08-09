# V7 Source And Documentation Closure — R8.12

## Decision

R8.12 replaces the R0.2 fixture-only source gate with a production-derived,
fail-closed gate. Every JavaScript module under `src/` and `app/` is parsed as
an ESTree AST, assigned to exactly one active descriptor owner and source kind,
and compared with a committed exact baseline. Fixture models remain useful
negative controls but can no longer make the production path green.

H022 and H023 return from `regressed` to `accepted`. Their original human
acceptance remains valid because this step changes internal responsibility and
governance surfaces without changing the accepted visible workflow. Five later
recovery regressions remain; R8.13–R8.15 are not cleared early.

## Binding Production Evidence

`v7-production-source-quality-policy.json` classifies all 48 active modules
exactly once. `production-source-quality-analyzer.js` scans 301 production
files, 22,279 effective code lines, 2,370 functions, and 302 public exports.
The committed baseline records source hashes plus file/function measurements,
owners, public documentation, protected invariants, and debt comments.

The positive result has:

- zero file-size or function-size violations;
- zero mixed/missing responsibility or artificial-fragment violations;
- zero undocumented public-contract fields across all 302 exports;
- all six required protected invariants located in production source;
- zero untracked TODO/FIXME/HACK, compatibility, or debt comments;
- zero size or function exceptions.

The largest production files remain within their kind budgets: runtime 392 of
400 lines, composition 231 of 250, adapter 442 of 450, and UI 448 of 450. The
largest functions remain within their kind budgets: runtime 78 of 80,
composition 58 of 60, adapter 79 of 80, and UI 80 of 80. These are exact gates,
not review-only warnings.

## Public Contract And Invariant Documentation

Every active `public.js` facade now documents owner, purpose, inputs, outputs,
side effects, lifecycle, errors, and concurrency/cancellation. Declaration-
specific documentation overrides the facade contract where a narrower API
needs more detail; missing fields fall back only to the owning public facade.

Production source explicitly explains the required invariants:

- `session-identity` at the identity and persistence boundaries;
- `stale-rejection` at activation, transaction identity, and Session owners;
- `atomic-commit` in the synchronous post-paint transaction commit turn;
- `no-future` before projection eligibility and aggregation;
- `projection-alignment` where the registered aggregation policy receives its
  timeframe/calendar context;
- `viewport-wall` where native logical coordinates become durable wall
  distance and span semantics.

## Responsibility Splits

Files that exceeded effective-code or function budgets were split through
their existing owners rather than replaced by forwarding shards. The bounded
splits cover Workstation Settings validation, Session workspace-record
normalization, Workspace State initialization, foundation history planning,
Replay Workspace composition/mount/form primitives, and Lightweight Charts
surface, presentation, interaction, and snapshot concerns. Public ownership
and command/event contracts are unchanged.

The architecture baseline remains clean at 48 modules, 125 dependency edges,
115 construction sites, seven critical writer sites, two hosted production
roots, and zero blocking findings. The one additional construction-site record
is an analyzer-visible source-location split of existing Workstation Settings
normalization, not a new owner or writer.

## Fail-Closed Negative Controls

The source-quality Harness first analyzes real production and verifies the
exact baseline. Production-derived mutations then prove rejection of an
oversized file, long function, second responsibility, missing public-contract
field, missing protected invariant, untracked debt, artificial fragment, and
source-hash drift. The original seven fixture controls remain, for 15 negative
controls total.

The production architecture Harness separately remains green with its nine
production-derived mutations. The Replay Workspace composition Harness now
scans the whole UI module after the mount split and requires an actual
presentation-port injection call rather than accepting a function declaration
as evidence.

## Verification

The production source-quality and architecture Harnesses pass. Focused Session
Store, Workstation Settings, Workspace State, Workspace Transaction, Module
Host, Replay Workspace composition/UI, Lightweight Charts browser, production
application-host browser, and full Replay Workspace browser Harnesses pass.
The complete `tests/*-harness.js` repository sweep also passes; a final
`git diff --check` remains mandatory immediately before the R8.12 commit.

## R8.16 Post-Closure Evidence Consistency

An independent audit after R8.15 found `BUG-V7-0006`; R8.16 added the missing
reconciliation boundary between the exact snapshot and prose. After R10.8 the
same gate records 363 files, 28,451 effective lines, 3,008 functions, and 352
public exports, and all declared current summaries carry that exact tuple.

R8.16 declares the seven current summary-evidence files and eight required
occurrences in `v7-production-source-quality-policy.json`. The production
source-quality validator discovers real Markdown evidence, extracts each
current tuple, compares all four totals with the canonical baseline, rejects
missing/duplicate/omitted declarations, and fails closed when one negative
mutation restores the incorrect line total or another removes a policy entry.
H023 remains accepted with stronger evidence; recovery mode remains inactive
and production behavior is unchanged.
