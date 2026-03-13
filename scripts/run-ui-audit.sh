#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="${BASE_URL:-http://127.0.0.1:3006}"
REPORT_DIR="${UI_AUDIT_REPORT_DIR:-${ROOT_DIR}/tmp/ui-audit}"
PORT="$(BASE_URL="${BASE_URL}" python3 -c 'from urllib.parse import urlparse; import os; parsed = urlparse(os.environ["BASE_URL"]); print(parsed.port or (443 if parsed.scheme == "https" else 80))' 2>/dev/null)"
RUNTIME_DIR="$(mktemp -d "${TMPDIR:-/tmp}/petong-ui-audit.XXXXXX")"

if ! command -v python3 >/dev/null 2>&1; then
  echo "[ui-audit] python3 not found"
  exit 1
fi

if ! python3 - <<'PY' >/dev/null 2>&1
import selenium  # noqa: F401
PY
then
  echo "[ui-audit] selenium python package not found"
  exit 1
fi

mkdir -p "${REPORT_DIR}"

PORT="${PORT}" \
PETONG_DATA_FILE="${RUNTIME_DIR}/petong-data.json" \
PETONG_PLATFORM_DATA_FILE="${RUNTIME_DIR}/petong-platform.json" \
PETONG_TRANSPARENCY_DATA_FILE="${RUNTIME_DIR}/petong-transparency.json" \
node "${ROOT_DIR}/backend/index.js" >"${REPORT_DIR}/backend.log" 2>&1 &
BACKEND_PID=$!

cleanup() {
  if kill -0 "${BACKEND_PID}" >/dev/null 2>&1; then
    kill "${BACKEND_PID}" >/dev/null 2>&1 || true
    wait "${BACKEND_PID}" 2>/dev/null || true
  fi
  rm -rf "${RUNTIME_DIR}"
}
trap cleanup EXIT

if ! BASE_URL="${BASE_URL}" BACKEND_PID="${BACKEND_PID}" python3 - <<'PY'
import os
import time
import urllib.request

base_url = os.environ["BASE_URL"].rstrip("/")
deadline = time.time() + 20
while time.time() < deadline:
    if os.environ.get("BACKEND_PID"):
        try:
            os.kill(int(os.environ["BACKEND_PID"]), 0)
        except OSError:
            raise SystemExit(1)
    try:
        with urllib.request.urlopen(f"{base_url}/health", timeout=2) as response:
            if response.status == 200:
                raise SystemExit(0)
    except Exception:
        time.sleep(0.4)
raise SystemExit(1)
PY
then
  echo "[ui-audit] backend did not become healthy"
  exit 1
fi

BASE_URL="${BASE_URL}" UI_AUDIT_REPORT_DIR="${REPORT_DIR}" CHROME_BINARY="${CHROME_BINARY:-}" python3 "${ROOT_DIR}/frontend/tests/selenium_ui_sequences.py"
