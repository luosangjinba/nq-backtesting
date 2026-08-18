# Session — P1b.1 Local Package Contract And Archive Implementation

Date: 2026-08-11–2026-08-12

Branch: `feature/v7-drawing-semantic-annotation`

Status: implemented; H117 executable for the P1b.1 subset but not accepted;
no P1b.2–P1b.4 implementation authorized

## Authorization And Boundary

After accepting the binding P1b specification and its five material decisions,
the product owner separately instructed:

> 授权按已验收的 P1b 规格开始实现 P1b.1。

This session implements only P1b.1: Manifest V2/profile/schema/catalog, pack
v2, strict archive inspection, portable candidate/receipt evidence, and
synthetic negative fixtures. It adds no package store or browser storage, no
Plugin Center local-package UI, no Developer Mode browser adapter, no MCP
server, no external ModuleHost descriptor, no package import/evaluation, and
no activation or business contribution.

## Delivered Contract Boundary

- Extended the existing pure `core.plugin-contract` with branded portable
  `PluginPackageManifestV2` and inactive candidate-plan values. The local
  profile rejects Core/first-party identity claims, non-empty capability/
  contribution/permission arrays, execution tiers/entrypoints, inspector or
  instance settings, non-portable values, and non-declarative or namespace-
  escaping migrations.
- Kept the production graph unchanged: the pure plan has no module descriptor,
  callback, owner handle, storage command, DOM, or lifecycle state.
- Added the additive `local-declarative-package-v1` profile, deterministic
  `.v7plugin` media/format contract, 22 total public schemas, 10 total catalogs,
  append-only diagnostics, exact archive limits and host-API identity, and a
  synthetic `local-lifecycle-v1` workspace that publishes no live capability
  or contribution.

## Canonical Operation And Archive Boundary

- Preserved all P1a request/operation-v1 paths. Local scaffold/validate/build/
  test/preview use request schema v2 with operation v1; local pack/inspect use
  operation v2 and require the explicit profile and output/target fields.
- Added `unpacked-local-candidate` and `local-install-archive`; the output kind
  is never inferred from a path or suffix. Both forms use the same canonical
  entry set. The latter is deterministic uncompressed ustar with media type
  `application/vnd.replay-lab.v7-plugin+tar` and suffix `.v7plugin`.
- Finalized the archive manifest with the exact current build/test/preview
  receipt digests. The developer-evidence and package-candidate receipts bind
  workspace, source, manifest, fixture, expected-output, build payload,
  test/preview, SDK/schema/catalog/operation/toolchain, content index,
  provenance, license, settings, migrations, permissions, unavailable claims,
  and explicit inactive/trust/execution denials.
- Hardened the shared in-memory tar reader for canonical UTF-8 and NFC paths,
  alternate separators/traversal, normalization and file/directory-prefix
  collisions, duplicate/order violations, exact ustar header bytes, links/
  devices/extensions, padding, trailing bytes, entry/file/total limits, and
  normalized metadata. Local inspection additionally rejects undeclared files,
  extensionless nested-archive magic, changed payload/index bytes, stale or
  internally mismatched receipts, mismatched toolchains, host-path provenance,
  wrong suffixes, and renamed P1a evidence bundles. It extracts nothing and
  imports/evaluates no payload.
- Split workspace input and Developer Kit output I/O. Output creation/readback
  now walks only real directories, refuses symlink or special-file traversal,
  and uses no-follow file creation; contract-source dependencies are included
  in the content-addressed toolchain identity.

## H117 P1b.1 Evidence

H117 is now registered as `executable`, not `accepted`. The dedicated Harness
proves:

- two clean roots produce canonical-result-equivalent flows and byte-identical
  `.v7plugin` archives;
- an unpacked prepared candidate matches the archive entry-for-entry and
  byte-for-byte;
- Library and CLI return the same canonical result;
- inspection yields only a portable `candidate` plan with `installed`,
  `activated`, `publisherTrusted`, and `productionExecutionAuthorized` false;
- both archive and prepared-directory sources must satisfy the cataloged host
  API before yielding their distinct unverified/developer-local trust records;
- `.v7dk.tar` and renamed P1a evidence never become install candidates;
- 18 cataloged negative groups first establish a valid baseline and then prove
  request closure, identity/permission/contribution/execution/settings/
  migration denials, stale receipts, format separation, index/receipt tamper,
  path/Unicode/metadata hardening, undeclared/nested entries, and forbidden
  lifecycle operations.

H117 remains unaccepted because the binding full gate also requires the later
P1b.2 transaction/recovery owner, P1b.3 browser product/Developer Mode and human
review, and P1b.4 authoring MCP/security/equivalence closure.

## Verification

- `node v7/tests/local-plugin-package-harness.js` passes H117's P1b.1 subset
  with 18 negative groups and deterministic archive/prepared-layout evidence.
- `node v7/tests/plugin-developer-kit-harness.js` passes accepted H116 with all
  20 P1a negative groups, real FVG isolated execution, and exact P1a bundle
  behavior.
- Plugin Contract, production architecture, source-quality, module assembly,
  ModuleHost, writer closure, deployed-runtime, architecture-hardening, and
  relevant schema/catalog regression gates pass.
- The exact production source baseline is 582 files, 52,593 effective lines, 5,470 functions, and 558 public exports with zero accepted exception.
- `git diff --check` passes.
- No browser or human visual gate is claimed because P1b.1 changes no product
  surface; H117 retains its required later human gate.

## Next Gate

P1b.1 stops at this bounded commit. The exact next product decision is whether
to separately authorize **P1b.2 — Inventory transaction owner**. Until then,
do not implement package bytes/inventory storage, migrations/recovery runtime,
quarantine/tombstones/restricted mode, P1b.3 UI/Developer Mode, P1b.4 MCP, or
H117 acceptance.

Binding specification:
`../docs/V7_LOCAL_PLUGIN_PACKAGES_AUTHORING_MCP_P1B.md`.
