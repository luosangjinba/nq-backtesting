# Session — R10.2 Linux Public IPv4 And Runtime Compatibility

Date: 2026-08-05
Status: implemented; Alibaba Linux rerun pending

## Real-Host Evidence

- repository commit `19ad1d96` was present on the host;
- DuckDB was present at `/srv/replay-lab-data/trading_data.duckdb`;
- apply stopped during dnf dependency resolution, before release/systemd
  mutation, because NodeSource Node.js 24 conflicted with Alibaba Linux npm;
- a legacy Python 3.11 V4 process was already listening on 127.0.0.1:8766;
- V7 8007 was not listening and no Replay Lab systemd units existed;
- the tunnel command was mistakenly run on the cloud host rather than Windows,
  confirming the reviewer prefers direct-IP access.

## Delivered Correction

- reuse supported Node/npm and select a supported Python interpreter;
- fail closed on unmanaged 8007/8766 listeners;
- add authenticated direct public-IPv4 HTTPS with a Caddy-managed short-lived
  Let's Encrypt certificate;
- retain loopback application listeners, read-only DuckDB enforcement, public
  mutation blocking, immutable releases, health rollback, and open overall
  acceptance state.

## Verification

- shell syntax and deployment Harness pass;
- domain rendering validates with the installed Caddy compatibility path;
- domain and public-IPv4 rendering both validate with official Caddy 2.11.3;
- architecture/source gates and `git diff --check` remain required before the
  bounded R10.2 commit.
