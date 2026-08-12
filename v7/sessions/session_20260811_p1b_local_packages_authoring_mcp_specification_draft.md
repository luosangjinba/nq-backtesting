# Session — P1b Local Packages And Authoring MCP Specification Draft

Date: 2026-08-11

Branch: `feature/v7-drawing-semantic-annotation`

## Authorization

After accepted P1a/H116, the product owner instructed:

> 修正 P1a 状态文档，并起草 P1b 规格；不实施 P1b。

This session is documentation-only. It corrects stale current-state language,
records the proposed P1b contract, and updates planning/handoff references. It
does not add a package archive/schema, package store, installer, Plugin Center
control, Developer Mode, MCP server, H117 metadata/Harness/fixtures, dependency,
or production/runtime behavior.

## Status Correction

`V7_CORE_AND_COMMUNITY_PLUGIN_MODEL_SPEC.md` still contained four current-state
statements from the P1a specification checkpoint which said P1a implementation
was not allocated and H116 was only declared. The historical statement that
the original ADR did not itself authorize P1a remains true, but the current
ledger now records the later separate authorization, commit, and accepted H116.

Historical session records were not rewritten: they continue to describe what
was authorized at their own checkpoint. The accepted P1a contract,
implementation session, TODO, roadmap, index, and restart handoff already
recorded the later closure.

## Primary-Source Review

The P1b draft was checked against current first-party documentation:

- Visual Studio Code supports explicit local VSIX installation and disables
  automatic update for manually installed archives by default;
- VS Code Workspace Trust makes restricted behavior explicit around untrusted
  workspace content;
- MCP `2025-11-25` defines client-launched `stdio`, filesystem Roots, and
  schema-described Tools;
- MCP security guidance calls out local-server startup commands, filesystem
  access, network exposure, visibility, consent, and sandboxing as material
  risks.

The draft copies workflow clarity, not privilege. It selects local `stdio`, one
startup-allowlisted workspace root, the canonical P1a operation engine, no
generic filesystem/shell/network tool, and no package lifecycle authority.

## Proposed P1b Boundaries

The draft asks the product owner to review five material decisions:

1. local installation stores a verified inactive package generation but does
   not activate or execute external code;
2. `.v7dk.tar` remains evidence-only and `.v7plugin` is a distinct deterministic
   install candidate created by explicit pack v2 behavior;
3. one device-local package-store owner owns immutable bytes, transaction
   journal, quarantine, rollback, and tombstones without absorbing the Core
   profile or ModuleHost;
4. Developer Mode loads a prepared candidate output directory; source build,
   isolated test, and preview remain P1a CLI/library operations reached through
   CLI or the proposed P1b MCP adapter;
5. MCP exposes only the eight P1a authoring tools through local `stdio` and can
   never install, enable, trust, update, uninstall, restart, or control V7.

The first proposed profile is `local-declarative-package-v1`. It permits only
metadata, host-rendered management/settings values, source/license disclosure,
receipts, and opaque artifacts. It has empty permissions, capabilities,
contributions, and entrypoint, and therefore never claims a local business
plugin is active before a declarative or Worker execution tier exists.

## Proposed Transaction And Recovery Contract

The proposed package-store transaction validates and plans without writes,
binds explicit user confirmation to exact candidate/inventory digests, stages
immutable bytes and declarative package-setting migration in private storage,
verifies the staged generation, and atomically publishes one inventory pointer.
Every failure retains the previous complete generation.

Upgrade, downgrade, same-version changed-digest replacement, quarantine,
rollback, restricted startup, and uninstall/data survival are explicit. P1b
migration is host-interpreted and package-setting-scoped; it cannot execute
scripts or rewrite Core profile, Session, Replay, Annotation, Workspace,
Journal, or other owner data. Uninstall retains identity/provenance/settings
needed to keep historical evidence understandable.

## Proposed H117

H117 remains prose-only until the draft is accepted and implementation is
separately authorized. The proposed gate covers:

- archive/evidence separation, deterministic pack v2, strict parsing,
  integrity, forged trust, permissions, and external-code rejection;
- exact-revision install/upgrade/downgrade/uninstall transactions, injected
  storage failures, crash recovery, migration, quarantine, Restricted Mode,
  and data survival;
- Developer Mode load/reload/unload and stale/path controls;
- MCP stdio/root/environment/cancellation limits and Library/CLI/MCP
  equivalence;
- real browser, focused human, architecture, writer, source-quality, deployed-
  runtime, P0a–P1a, and full regression evidence.

No `v7-harness-rules.json` entry or H117 implementation is part of this
documentation step.

## Verification

- the changed-file audit contains documentation/TODO/session files only;
- local specification/session references and Markdown code fences pass for all
  nine changed/new documents;
- the current-state scan finds no live statement that P1a implementation is
  unauthorized or that H116 is merely declared;
- every P1b/H117 status surface says draft/proposed and not accepted or
  implemented;
- `git diff --check` passes;
- H116 passes unchanged, including all eight operations, the real P0a/FVG
  references, exact TypeScript `7.0.2` identity, and all 20 negative controls.

No production, SDK, tool, schema, dependency, Harness rule, fixture, or visual
baseline changed, so no P1b runtime/browser gate was run or claimed.

## Next Gate

P1a/H116 remains closed. P1b is only a draft awaiting review. The next permitted
action is revision or explicit acceptance of its five material decisions.
Specification acceptance would still not authorize implementation; P1b.1
contract/archive implementation would require a separate product-owner
instruction.
