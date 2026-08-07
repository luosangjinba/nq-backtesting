# Session — R12.4 Swap Accounting Tolerance

Date: 2026-08-06

## Trigger

The first R12.3 host run installed dependencies, created/activated managed
swap, and then reported that it had not reached the 512 MiB floor. The kernel's
reported `SwapTotal` excluded the small `mkswap` header from the nominal file
size.

## Resolution

- add an explicit 8 MiB accounting tolerance;
- allocate the same bounded overhead for new managed files;
- accept an already-active nominal file on rerun and retain its persistent
  `/etc/fstab` entry;
- keep a shortfall beyond the tolerance as a hard failure;
- record the correction as R12.4/H095 rather than rewriting the pushed R12.3
  evidence.

## Automated Evidence

- `node v7/tests/resource-profile-harness.js` — pass;
- `node v7/tests/linux-deployment-script-harness.js` — pass;
- Bash syntax and `git diff --check` — pass.

## Human Gate

Pull R12.4 on the affected host and rerun deployment. Do not remove, resize, or
disable the existing managed swap file before the rerun.
