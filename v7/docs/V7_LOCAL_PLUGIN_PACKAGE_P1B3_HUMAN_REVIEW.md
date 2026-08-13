# P1b.3 Two-Surface Plugin Center Focused Human Review

Status: corrected review prepared after the accepted Developer Mode removal;
human result pending; this record does not accept H117 or authorize P1b.4

Date prepared: 2026-08-12

## Start The Bounded Review Surface

From the repository root, run:

```bash
node v7/scripts/review-local-plugin-package-p1b3.mjs
```

The command opens a fresh-profile Chromium window containing the real P1b.3
Plugin Center controls, package-contract inspection, package-store runtime, and
IndexedDB adapter. The small `Review controls` strip is test infrastructure: it
queues a current P1a-built archive and can inject one commit failure or
Restricted Mode. It does not bypass inspection, preparation, commit, or
recovery.

Close that browser window or press `Ctrl+C` in the terminal to delete the
temporary profile and package fixture.

## Focused Checklist

Record pass/reject for each item. A rejection keeps H117 executable and open.

1. **The information architecture is minimal and honest.** The Plugin Center
   initially shows a compact, ordinary-height two-tab strip with exactly
   `Included` and `Installed`. No Developer Mode tab, toggle, warning, prepared-
   directory action, or development generation appears.
2. **Included remains Core-only.** The Included surface identifies trusted-build
   Core packages. Local packages do not appear built-in, signed, active, or
   trusted.
3. **Install review is explicit.** In Installed, select `Queue install archive`
   and then `Install from file`. Before any write, the review visibly says
   `Unverified local source`, publisher trust is self-asserted, signatures are
   not applicable, integrity was checked, and installed does not mean active.
4. **Cancellation is harmless.** Cancel the first review. Focus returns to
   `Install from file`, and no installed package appears.
5. **Commit failure is recoverable.** Queue the archive again, open its review,
   choose `Fail next install commit`, and confirm installation. The review stays
   open, an actionable `V7DK_STORAGE_COMMIT_FAILED` error appears, and retrying
   the same confirmation installs exactly one inactive generation.
6. **Installed status is honest.** The detail identifies local/unverified
   provenance, self-asserted publisher, not-applicable signature, unavailable
   execution, host-rendered settings, and retention behavior. Change only the
   package-scoped `Lifecycle label`, apply it, then reset that override; profile
   scope stays untouched and the effective source returns to its definition.
7. **Restricted Mode is actionable and sanitized.** Choose `Enter Restricted
   Mode`. The surface explains Restricted Mode, exposes a stable diagnostic and
   recovery action, does not disclose an archive filename or package bytes, and
   returns to inventory after `Retry recovery`.
8. **Interaction and layout remain usable.** Tab and arrow-key focus are
   visible, right-arrow from Installed wraps to Included, status/error
   announcements are understandable, controls are not clipped at the default
   window, and resizing to roughly 620 px creates no horizontal page overflow.
   Reduced-motion preference is not defeated.

## Acceptance Boundary

The product owner accepted removal of the original top-level Developer Mode
because P1a already owns validate/build/test/preview/pack, Installed owns archive
admission, and P1b has no external preview/runtime outcome. Strict unpacked-
candidate inspection and path/receipt controls remain Developer Kit/security
evidence without a production mode, persistent preference, retained directory
handle, or development generation lifecycle.

The reviewer should report either `P1b.3 人工验收通过` or the exact rejected
item(s). Passing this checklist accepts only the focused P1b.3 visible
interaction evidence. H117 remains unaccepted until separately authorized P1b.4
Library/CLI/MCP equivalence and security controls also pass. This review does
not authorize MCP, package execution, activation, Workers, Marketplace, or
external lifecycle contributions.
