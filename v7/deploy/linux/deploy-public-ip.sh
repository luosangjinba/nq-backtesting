#!/usr/bin/env bash

set -Eeuo pipefail

# Backward-compatible entry. The unified orchestrator retains every historical
# public-IP option and owns new local/domain modes plus persisted host state.
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$script_dir/deploy.sh" "$@"
