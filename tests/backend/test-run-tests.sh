#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT_FILE="$(mktemp)"

cleanup() {
  rm -f "${OUTPUT_FILE}"
}

trap cleanup EXIT

if ! "${ROOT_DIR}/scripts/run-tests.sh" >"${OUTPUT_FILE}" 2>&1; then
  cat "${OUTPUT_FILE}"
  exit 1
fi

if grep -q "^npm error" "${OUTPUT_FILE}"; then
  cat "${OUTPUT_FILE}"
  echo "unexpected npm error noise in test discovery output"
  exit 1
fi
