#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INPUT_CSV="${1:-$ROOT_DIR/NQ_full_1min.csv}"
INSTRUMENT="${INSTRUMENT:-NQ}"
TABLE_NAME="${TABLE_NAME:-futures_1m}"
DATABASE_URL="${DATABASE_URL:-${POSTGRES_DSN:-}}"

if [[ -z "$DATABASE_URL" ]]; then
  echo "error: please set DATABASE_URL or POSTGRES_DSN first." >&2
  echo "example: export DATABASE_URL='postgresql://user:pass@host:5432/dbname'" >&2
  exit 1
fi

if [[ ! -f "$INPUT_CSV" ]]; then
  echo "error: input csv not found: $INPUT_CSV" >&2
  exit 1
fi

python3 "$ROOT_DIR/postgres_import_nq_1m.py" \
  --input "$INPUT_CSV" \
  --instrument "$INSTRUMENT" \
  --table "$TABLE_NAME" \
  --dsn "$DATABASE_URL" \
  --create-table \
  --truncate
