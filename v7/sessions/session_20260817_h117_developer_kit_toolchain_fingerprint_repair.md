# Session — H117 Developer Kit Toolchain Fingerprint Repair

Date: 2026-08-17

Branch: `feature/v7-drawing-semantic-annotation`

Status: minimum generated-baseline repair complete; H117 executable and
unaccepted; P1b.4 paused; no plugin implementation

## Product-Owner Direction

> 授权先修复 H117 Developer Kit fixture 工具链指纹过期；仅做根因确认和最小基线修复，不启动 P1b.4，不验收或改变 H117 状态，不实施其他插件。

## Failure Reproduced

Before repair, `node v7/tests/local-plugin-package-harness.js` stopped during
initial local baseline preparation with `V7DK_STALE_OUTPUT`, before exercising
H117's 54 frozen negative groups:

- the checked-in browser release identity and
  `sdk/plugin/examples/local-lifecycle-v1/v7-package.json` recorded
  `sha256:cff096e2c0a01f4c05120294425ddccc7a152dfde81b79a0458775ca87083c97`;
- the current checked-in Developer Kit release derived
  `sha256:a6c653c3334fc50da8bcb2b2bdaf381151f5dab9f34174101e764faf69b8cd61`.

The fail-closed rejection was correct. No stale check was weakened or bypassed.

## Root Cause

The prior generated identity came from commit `6672a23f`. Comparing every
Developer Kit digest component with the current release proved these values
unchanged:

- catalog: `sha256:a94371f93ea4332043a38b20f3fb03a2194d5bde34ace4409c01024c22208115`;
- operations: `sha256:4c7b823d8496bdcda08bffee48d6e4b890127b40b53db247853cd3f1077f345d`;
- schemas: `sha256:674f611db890531e15338e4ec4654f9703ae7a21d7188902b88dd59f95eb0421`;
- SDK: `sha256:a08b5e73be37f2ffbb97b111d4025b6fbad616a36c487e739496ac986fe9f1a0`;
- simulator: `sha256:ce3b9e0b9ca232c8cb48b4d4a6203b51a2729918333406a51594110bf7a99f24`;
- pinned compiler and toolchain catalog values.

Only the conformance digest changed, from
`sha256:4169cf67be319e5d0400b79412604d2b1c97947389c6808d5c9070fe8749c319`
to
`sha256:3b29e08c12051bd1cc8a17e8e37188add582d22b11ef4216ea2c1df1157e1e64`.

All changed conformance inputs trace to the accepted H119 whitespace correction
commit `2951a20f`:

- `docs/v7-harness-rules.json` recorded H119's corrected invariant, accepted
  state, positive evidence, and durable acceptance evidence;
- three existing P1b implementation session records synchronized the already-
  verified current production source totals.

Those changes were legitimate, but that commit omitted the existing generated-
output refresh. The mismatch was therefore stale derived evidence, not an SDK,
compiler, Schema, package-contract, execution, trust, or H117 semantic change.

## Minimum Repair

The existing canonical command
`node v7/scripts/refresh-plugin-package-browser-release.mjs` regenerated both
coupled outputs from the current release catalog:

- `src/plugin-center-ui/plugin-package-release-identity.js`;
- `sdk/plugin/examples/local-lifecycle-v1/v7-package.json`.

Both now carry exact digest
`sha256:a6c653c3334fc50da8bcb2b2bdaf381151f5dab9f34174101e764faf69b8cd61`.
Because the first output is a tracked production source, the existing
`refresh-production-source-quality-baseline.mjs` command updated exactly its
stored source hash. File, effective-line, function, export, responsibility,
owner, contract, invariant, and debt counts did not change.

No hand-edited digest, stale-check exception, toolchain version, SDK/catalog/
Schema value, package behavior, H117 rule field, P1b.4 surface, or plugin code
was added.

## Verification

The bounded repair passed:

- exact identity comparison proved the derived release, generated browser
  release, and example manifest all carry
  `sha256:a6c653c3334fc50da8bcb2b2bdaf381151f5dab9f34174101e764faf69b8cd61`;
- `node v7/tests/local-plugin-package-harness.js` passed the complete H117
  package-contract, transaction, IndexedDB/storage, product-browser, and
  unpacked-candidate-security suites with 18 + 18 + 18 frozen negative groups;
- `node v7/tests/plugin-developer-kit-harness.js` passed H116, its 20 negative
  controls, all eight operations, and both trusted Harnesses;
- `node v7/tests/plugin-contract-substrate-harness.js` passed P0a;
- `node v7/tests/core-plugin-center-harness.js` passed P0b with its real
  restart, fallback, retention, and browser evidence;
- `node v7/tests/calculated-series-pure-contract-harness.js` passed H118 and
  reported H117's governance state unchanged;
- `node v7/tests/calculated-series-chart-projection-harness.js` passed H119
  with the corrected Main/internal whitespace evidence;
- source-quality, production architecture, architecture hardening, production
  module assembly, writer closure, and deployed-runtime architecture passed;
- the source-quality refresh changed only the generated browser identity's
  stored source hash while retaining 534 files and 519 public exports;
- `git diff --check` passed.

One exploratory concurrent real-Chromium batch caused CDP `Uncaught` wait
failures in H116's trusted FVG child and P0b. Both required standalone reruns
then passed; the final evidence therefore uses their intended serial execution
rather than treating the concurrency interference as product evidence.

## Governance Boundary

H117 remains `executable`, `humanReviewRequired: true`, and
`acceptanceEvidence: null`. This repair supplies current executable evidence;
it does not accept or reclassify H117, start P1b.4, allocate/register
P1c.3/H120, implement SMA, or start another plugin.
