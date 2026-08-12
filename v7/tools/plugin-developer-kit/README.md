# V7 Plugin Developer Kit P1a

This directory contains the one canonical P1a operation engine. The public
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
deny installation, activation, publisher trust, and production execution. P1b
installation/MCP, registry access, and a production Worker are not implemented
here.
