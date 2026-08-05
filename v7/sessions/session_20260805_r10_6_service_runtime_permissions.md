# Session — R10.6 Service Runtime Permissions

## Trigger

The Alibaba R10.5 rerun installed runtime dependencies and the committed
release, then failed when the dedicated `replay` user attempted to execute
`/opt/replay-lab/shared/venv/bin/python`. The database read precheck itself
passed; the failure was parent/runtime-tree access inherited from root-created
content under a potentially restrictive umask.

## Correction And Evidence

The installer establishes umask `022`, then normalizes the shared venv and each
immutable release to root ownership with `replay`-group read/traverse/execute
access and no public access. This repairs the existing venv on the next run as
well as new hosts. The quick wrapper also restores its incoming umask after a
successful root-only password write.

H083 binds the ownership/mode commands and password-umask restoration. Shell
syntax, focused deployment, architecture/source, real Caddy configuration, and
`git diff --check` gates remain required. The host rerun remains open.
