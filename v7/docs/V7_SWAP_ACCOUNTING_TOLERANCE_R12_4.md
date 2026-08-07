# V7 Managed Swap Accounting Tolerance — R12.4

Status: binding correction; host rerun pending

## Failure

R12.3 created and activated the requested managed swap file, but then compared
Linux `SwapTotal` to the file's nominal size with exact integer MiB equality.
`mkswap` reserves a small header, so a nominal 512 MiB file can be reported as
511 MiB. The installer consequently rejected a healthy swap configuration with
`swap provisioning did not reach the required 512 MiB floor`.

## Correction

The capacity owner defines an 8 MiB maximum accounting tolerance:

- a kernel-reported total within 8 MiB of the nominal policy floor is accepted;
- a larger shortfall still fails closed;
- newly created files include the same 8 MiB overhead so their reported total
  normally reaches the nominal floor immediately;
- an already-active R12.3 managed file is accepted on rerun and its `/etc/fstab`
  persistence is verified without `swapoff`, deletion, or recreation.

The tolerance is only for `mkswap` metadata accounting. It does not lower the
512 MB physical-memory class, DuckDB memory limit, disk-reserve requirement, or
profile-selected nominal swap floor.

## Evidence

H095 proves that 511/512 MiB is accepted while 503/512 MiB remains rejected,
and reruns the resource-profile and rendered Linux deployment Harnesses. The
remaining human gate is to pull the correction on the affected host and rerun
the same one-command deployment without manually changing swap state.
