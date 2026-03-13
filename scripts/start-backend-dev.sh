#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENTRYPOINT="${PETONG_DEV_ENTRYPOINT:-backend/index.js}"

if ! command -v node >/dev/null 2>&1; then
  echo "[dev] node is required to start the backend"
  exit 1
fi

if ! node --help | grep -q -- "--watch"; then
  echo "[dev] this Node.js runtime does not support --watch"
  exit 1
fi

cd "${ROOT_DIR}"
exec node \
  --watch \
  --watch-preserve-output \
  --watch-path=backend \
  --watch-path=frontend \
  "${ENTRYPOINT}"
