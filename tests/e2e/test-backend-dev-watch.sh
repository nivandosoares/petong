#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT_FILE="$(mktemp)"
FIXTURE_FILE="$(mktemp --suffix=.js)"
trap 'rm -f "${OUTPUT_FILE}" "${FIXTURE_FILE}"' EXIT

if ! command -v timeout >/dev/null 2>&1; then
  echo "[test] timeout is required for backend dev watch test"
  exit 1
fi

cat <<'EOF' >"${FIXTURE_FILE}"
console.log("dev-watch-fixture-started");
setInterval(() => {}, 1000);
EOF

set +e
PETONG_DEV_ENTRYPOINT="${FIXTURE_FILE}" timeout 5 bash "${ROOT_DIR}/scripts/start-backend-dev.sh" >"${OUTPUT_FILE}" 2>&1
STATUS=$?
set -e

if [ "${STATUS}" -ne 0 ] && [ "${STATUS}" -ne 124 ]; then
  cat "${OUTPUT_FILE}"
  echo "[test] backend dev watch script exited unexpectedly"
  exit 1
fi

grep -q "dev-watch-fixture-started" "${OUTPUT_FILE}" || {
  cat "${OUTPUT_FILE}"
  echo "[test] backend dev watch script did not start the backend"
  exit 1
}
