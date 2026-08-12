# Session — P1b Local Packages And Authoring MCP Specification Acceptance

Date: 2026-08-11

Branch: `feature/v7-drawing-semantic-annotation`

Status: specification accepted; implementation not authorized; H117 declared
but not registered, implemented, or accepted

## Product-Owner Decision

After receiving a detailed explanation of the five P1b material decisions, the
product owner instructed:

> 5项决策全接受，可以进行下一步

This explicitly accepts the five decisions and closes specification review.
Consistent with the already-recorded phase boundary and the prior “不实施 P1b”
constraint, this checkpoint records specification acceptance only. No P1b
implementation was performed; P1b.1 still requires its separate implementation
instruction.

## Accepted Material Decisions

1. Installation stores and manages a verified inactive generation; it is not
   activation or external-code execution.
2. `.v7plugin` is a distinct deterministic install candidate; P1a `.v7dk.tar`
   remains evidence-only and cannot be renamed or inferred into installability.
3. One device-local `core.plugin-package-store` owns immutable inventory
   generations and transactions without absorbing Core profile, ModuleHost,
   domain evidence, or application lifecycle ownership.
4. Developer Mode loads only prepared candidate output. Source compilation,
   isolated tests, and preview remain in the canonical P1a operation engine.
5. MCP is a local `stdio`, workspace-bounded authoring adapter over the eight
   P1a operations and has no package-lifecycle or application authority.

These decisions make
`docs/V7_LOCAL_PLUGIN_PACKAGES_AUTHORING_MCP_P1B.md` the binding P1b
specification.

## State After Acceptance

- P0a/H113, R13.10e/H114, P0b/H115, and P1a/H116 remain implemented and
  accepted;
- P1b specification: accepted;
- P1b implementation: not authorized and not present;
- H117: declared in prose, with no machine-readable rule, Harness fixture,
  implementation, browser evidence, human evidence, or acceptance result;
- `.v7plugin`, Manifest V2 schema/catalog, package store, storage adapter,
  Plugin Center local-package UI, Developer Mode, and MCP server: not present;
- P2 registry, P3a Worker, P3b Pine migration, P4 Marketplace, new business
  plugins, and R13.11–R13.13: separately gated.

## Verification

This checkpoint changes documentation, TODO, handoff, and session records only.
It passes:

- a current-state scan with every live P1b status surface reporting accepted
  specification plus unimplemented/unauthorized delivery;
- Markdown reference and code-fence checks for the changed documentation;
- the unchanged P1a/H116 Developer Kit Harness;
- `git diff --check`.

No P1b production, SDK, schema, dependency, Harness rule, fixture, storage,
browser, MCP, or visual baseline changed, so no P1b runtime/browser/human gate
is run or claimed.

## Next Gate

The exact next product decision is whether to issue the separately required
authorization for **P1b.1 — Contract and archive**. Until that instruction is
given, P1b.1 and every later P1b slice remain blocked from implementation.

## Evidence

- binding specification:
  `../docs/V7_LOCAL_PLUGIN_PACKAGES_AUTHORING_MCP_P1B.md`;
- original draft session:
  `session_20260811_p1b_local_packages_authoring_mcp_specification_draft.md`.
