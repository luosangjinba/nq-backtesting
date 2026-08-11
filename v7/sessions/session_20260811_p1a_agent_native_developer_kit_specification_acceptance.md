# Session — P1a Agent-Native Developer Kit Specification Acceptance

Date: 2026-08-11

Status: specification accepted; implementation not authorized; H116 remains
declared

## Review

After the P1a specification checkpoint, the product owner requested a detailed
plain-language explanation of the proposed Developer Kit. The review explained
the authoring workflow, strict-TypeScript build, canonical operation engine,
workspace layout, immutable synthetic host, isolated developer test process,
host-rendered parameters, deterministic receipt, developer evidence bundle,
H116, and the P1a–P3b phase boundaries.

The review reduced the approval decision to four material choices. The product
owner explicitly accepted all four:

1. P1a owns development and evidence only; P1b owns installation.
2. The initial P1a profile supports only real FVG and
   `trusted-built-in-core-v1` rather than placeholder future tiers.
3. The developer test process is entirely separate from the future production
   Worker.
4. `.v7dk.tar` can never be interpreted as installation or execution
   authorization.

This constitutes acceptance of
`docs/V7_AGENT_NATIVE_PLUGIN_DEVELOPER_KIT_P1A.md` as the binding P1a
specification.

## Rationale Preservation

The product owner asked whether the detailed explanation should be preserved
to prevent future loss of the original design reasoning. V7 now records it in
`docs/V7_AGENT_NATIVE_PLUGIN_DEVELOPER_KIT_P1A_RATIONALE.zh-CN.md`.

The Chinese rationale is a non-normative companion. It explains why the
boundaries exist and how the stages relate; the accepted P1a specification
remains authoritative if wording ever diverges.

## State After Acceptance

- P1a specification: accepted;
- P1a implementation: not authorized;
- H116: `declared`, with no Harness, negative fixtures, or acceptance evidence;
- current implemented Harness step: P0b;
- production source, dependencies, owner graph, Plugin Center, Core profile,
  and pixels: unchanged;
- P1b local packages/MCP, P2 registry, P3a Worker, P3b Pine migration, and new
  business plugins: separately gated.

The exact next product decision is whether to authorize the bounded P1a
implementation. Acceptance of this specification does not implicitly make
that authorization.

## Verification

The documentation-only acceptance checkpoint passes:

- architecture hardening with 116 registered rules and 15 negative controls;
- architecture boundary;
- production architecture with 66 modules, 148 dependency edges, 128
  construction sites, 25 writer sites, and zero blocking findings;
- source quality with 465 production files, 428 public exports, and 22 negative
  controls;
- P0a Plugin Contract substrate with 25 negative controls;
- P0b Core Plugin Center headless regression;
- explicit state audit proving `currentStep: P0b`, H116 `declared`, and null
  H116 Harness/acceptance evidence;
- `git diff --check`.

No implementation Harness, production regression claim, or visual acceptance
is inferred from this documentation review.

## Evidence

- binding specification:
  `../docs/V7_AGENT_NATIVE_PLUGIN_DEVELOPER_KIT_P1A.md`;
- explanatory rationale:
  `../docs/V7_AGENT_NATIVE_PLUGIN_DEVELOPER_KIT_P1A_RATIONALE.zh-CN.md`;
- original specification session:
  `session_20260811_p1a_agent_native_developer_kit_specification.md`.
