#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="${BASE_URL:-http://127.0.0.1:3001}"
REPORT_DIR="${UI_AUDIT_REPORT_DIR:-${ROOT_DIR}/tmp/ui-audit}"

if ! command -v python >/dev/null 2>&1; then
  echo "[ui-audit] python not found"
  exit 1
fi

if ! python - <<'PY' >/dev/null 2>&1
import selenium  # noqa: F401
PY
then
  echo "[ui-audit] selenium python package not found"
  exit 1
fi

mkdir -p "${REPORT_DIR}"

node "${ROOT_DIR}/backend/index.js" >"${REPORT_DIR}/backend.log" 2>&1 &
BACKEND_PID=$!

cleanup() {
  if kill -0 "${BACKEND_PID}" >/dev/null 2>&1; then
    kill "${BACKEND_PID}" >/dev/null 2>&1 || true
    wait "${BACKEND_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

sleep 2

BASE_URL="${BASE_URL}" UI_AUDIT_REPORT_DIR="${REPORT_DIR}" python "${ROOT_DIR}/frontend/tests/selenium_ui_sequences.py"
