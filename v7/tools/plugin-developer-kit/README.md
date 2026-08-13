# V7 Plugin Developer Kit P1a / P1b.1

This directory contains the one canonical P1a/P1b.1 operation engine. The public
Library is `public.js`; the CLI is `cli/main.js`. Both accept the same closed
JSON request and return byte-equivalent canonical JSON.

From `v7/`, discover the complete SDK, schemas, catalogs, examples, operation
versions, limits, toolchain identities, and H116 identity with:

```bash
printf '%s' '{"schemaVersion":1,"operation":"discover","operationVersion":1,"options":{}}' \
  | node tools/plugin-developer-kit/cli/main.js --request -
```

The ordered authoring flow is `scaffold`, `validate`, `build`, `test`,
`preview`, `pack`, then `inspect`. `scaffold` takes a new empty
`workspaceRoot` and `options.templateId: "trusted-fvg-v1"`. Build through pack
take that workspace plus a separate explicit `outputRoot`. Bundle inspection
uses the output root as `workspaceRoot`, with:

```json
{
  "schemaVersion": 1,
  "operation": "inspect",
  "operationVersion": 1,
  "workspaceRoot": "/explicit/developer-output",
  "options": {
    "target": "bundle",
    "path": "bundles/first-party.fair-value-gap-1.0.0.v7dk.tar"
  }
}
```

Exit codes are `0` passed, `1` candidate conformance failure, `2` bad or
unsupported request, `3` blocked isolation, and `4` internal toolchain failure.
On Linux, executable `test` and `preview` require bubblewrap, network/user/PID
namespaces, and Node's permission/VM-module support; unavailable enforcement
returns `blocked` and never falls back to in-process execution.

P1a output is developer evidence only. `.v7dk.tar` and every receipt explicitly
deny installation, activation, publisher trust, and production execution.
P1b.1 additionally supports the synthetic `local-lifecycle-v1` template under
request schema v2. Build/test/preview stay operation v1; `pack`/`inspect` use
operation v2 with an explicit `local-declarative-package-v1` profile and either
`unpacked-local-candidate` or `local-install-archive` output. The resulting
`.v7plugin` is an installation candidate only: no package store, production UI,
MCP, activation, external module import, registry access, or Worker exists in
this slice.

The later P1b.3 product correction deliberately keeps Developer Mode out of the
production Plugin Center. Prepared `unpacked-local-candidate` outputs remain
Developer Kit artifacts. The tooling-only unpacked inspection adapter preserves
bounded double snapshots and path/symlink/special-file/receipt checks without a
persistent mode, retained generation, install command, or execution authority.
