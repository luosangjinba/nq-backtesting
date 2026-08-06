# Session — R10.10 Debian/Ubuntu Versioned Venv Recovery

Date: 2026-08-05
Status: implemented; affected-host rerun pending

## Finding

A clean Debian/Ubuntu host exposed Python 3.12 but lacked the matching venv
package. The former discovery probe used `python -m venv --help`, which exits
successfully even when `ensurepip` is unavailable. The installer therefore
treated Python as ready, requested no venv package, and actual environment
creation stopped after leaving a partial shared virtualenv.

## Correction

- Python discovery now requires Python 3.10+, importable `ensurepip`, and the
  `venv` module before an interpreter is accepted.
- A missing probe causes apt package planning to request the distribution
  `python3-venv` dependency.
- Apply validates that the shared environment has pip and a real venv prefix;
  an incomplete directory is recreated with `python -m venv --clear`.
- The Linux deployment Harness binds both the `ensurepip` probe and partial-
  environment recovery path.

## Host Continuation

For the already affected Python 3.12 host, install `python3.12-venv`, recreate
`/opt/replay-lab/shared/venv` with `--clear`, and rerun the same deployment
command. Record all four service health results; the wider R10.9 clean-host
database-import acceptance remains open.
