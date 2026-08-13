# P1b.3 Plugin Center And Developer Mode Focused Human Review

Status: compact-tab correction complete; Developer Mode product disposition
pending product-owner direction; this record does not accept H117 or authorize
P1b.4

Date prepared: 2026-08-12

## Start The Bounded Review Surface

From the repository root, run:

```bash
node v7/scripts/review-local-plugin-package-p1b3.mjs
```

The command opens a fresh-profile Chromium window containing the real P1b.3
Plugin Center controls, real package contract inspection, real package-store
runtime, and real IndexedDB adapter. The small `Review controls` strip is test
infrastructure: it queues a current P1a-built archive or prepared directory and
can inject one commit failure or Restricted Mode. It does not bypass package
inspection, preparation, commit, or recovery.

Close that browser window or press `Ctrl+C` in the terminal to delete the
temporary profile and package fixture.

## Focused Checklist

Record pass/reject for each item. A rejection keeps H117 executable and open.

1. **Included remains Core-only.** The initial Included tab identifies the Core
   surface. Installed and Developer Mode are visibly separate; local packages
   do not look built-in or trusted. All three labels form one compact,
   ordinary-height tab strip rather than expanding vertically with the panel.
2. **Install review is explicit.** In Installed, select `Queue install archive`
   and then `Install from file`. Before any write, the review visibly says
   `Unverified local source`, publisher trust is self-asserted, signatures are
   not applicable, integrity was checked, and installed does not mean active.
3. **Cancellation is harmless.** Cancel the first review. Focus returns to
   `Install from file`, and no installed package appears.
4. **Commit failure is recoverable.** Queue the archive again, open its review,
   choose `Fail next install commit`, and confirm installation. The review stays
   open, an actionable `V7DK_STORAGE_COMMIT_FAILED` error appears, and retrying
   the same confirmation installs exactly one inactive generation.
5. **Installed status is honest.** The detail identifies local/unverified
   provenance, self-asserted publisher, not-applicable signature, unavailable
   execution, host-rendered settings, and retention behavior. It never claims
   activation, trust, or Core membership. Change only the package-scoped
   `Lifecycle label`, apply it, then reset that package override; the profile
   scope must remain untouched and the effective source must return to the
   definition default.
6. **Restricted Mode is actionable and sanitized.** Choose `Enter Restricted
   Mode`. The surface explains Restricted Mode, exposes a stable diagnostic and
   recovery action, does not disclose an archive filename or package bytes, and
   returns to the installed inventory after `Retry recovery`.
7. **Developer Mode is deliberate and conspicuous.** Use the tab arrow keys or
   mouse to open Developer Mode. It starts off in this fresh profile. Enabling
   it displays the persistent `DEVELOPER MODE · ON` marker and explains that it
   is device-local, unsynchronized, inactive, and non-watching.
8. **Prepared load/reload/pack stays inactive.** Choose `Queue prepared
   directory`, then `Load unpacked`. The card says `developer inactive` and `no
   watcher`. `Reload` succeeds explicitly; `Validate/Pack` reports a bounded
   saved archive without installing it; `Unload` removes the session generation.
9. **Disable unloads everything.** Load the prepared directory again, then turn
   Developer Mode off. Every development generation disappears. Turn it back
   on and confirm that no generation was silently restored.
10. **Interaction and layout remain usable.** Tab and arrow-key focus are
    visible, status/error announcements are understandable, controls are not
    clipped at the default window, and resizing to roughly 620 px does not
    create horizontal page overflow. Reduced-motion system preference must not
    be defeated by decorative motion.

## Acceptance Boundary

The post-implementation product review recorded that Developer Mode currently
adds no unique user outcome beyond P1a validate/build/test/preview/pack and the
Installed archive-admission flow. The recommendation is to remove it as a
top-level production mode while preserving strict unpacked-candidate inspection
as developer tooling/security evidence. Do not treat this checklist as final
visible acceptance until the product owner explicitly retains, relocates, or
removes that surface.

The reviewer should report either `P1b.3 人工验收通过` or the exact rejected
item(s). Passing this checklist accepts the focused P1b.3 visible interaction
evidence only. H117 remains unaccepted until the separately authorized P1b.4
Library/CLI/MCP equivalence and security controls also pass; this review does
not authorize MCP, package execution, activation, Workers, Marketplace, or
external lifecycle contributions.
