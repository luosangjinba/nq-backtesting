# V7 Plugin SDK 1.0.0

The initial public SDK exposes portable strict-TypeScript values and one
stateless semantic-construction helper for the accepted
`trusted-built-in-core-v1` profile. Matching JSON Schemas, availability and
permission catalogs, the pinned toolchain identity, and deterministic examples
live beside the types.

Use the Developer Kit `discover` operation as the authoritative machine-readable
entry. P1b.1 adds the non-executing `local-declarative-package-v1` Manifest V2
and deterministic `.v7plugin` candidate format. A local package remains inactive and cannot claim
permissions, contributions, publisher trust, installation state, or production
execution.

Use operation v1 for the original `.v7dk.tar` evidence bundle. Use explicit
operation v2 `pack` output kinds for a prepared local candidate directory or
local install archive; file suffixes never select the operation implicitly.
