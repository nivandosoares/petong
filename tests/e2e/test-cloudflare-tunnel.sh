#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT_PATH="${ROOT_DIR}/scripts/start-cloudflare-tunnel.sh"
STATE_DIR="$(mktemp -d)"
CONFIG_FILE="${STATE_DIR}/config.yml"

cleanup() {
  rm -rf "${STATE_DIR}"
}

trap cleanup EXIT

bash "${SCRIPT_PATH}" print-config "http://localhost:9999" >/dev/null 2>&1 && {
  echo "print-config should fail when required variables are missing"
  exit 1
}

CF_TUNNEL_ID="11111111-2222-3333-4444-555555555555" \
CF_TUNNEL_HOSTNAME="preview.example.com" \
CF_TUNNEL_CREDENTIALS_FILE="/tmp/cloudflared-creds.json" \
CF_TUNNEL_CONFIG="${CONFIG_FILE}" \
bash "${SCRIPT_PATH}" print-config "http://localhost:9999" >/dev/null

grep -Fq "tunnel: 11111111-2222-3333-4444-555555555555" "${CONFIG_FILE}"
grep -Fq "credentials-file: /tmp/cloudflared-creds.json" "${CONFIG_FILE}"
grep -Fq "hostname: preview.example.com" "${CONFIG_FILE}"
grep -Fq "service: http://localhost:9999" "${CONFIG_FILE}"
grep -Fq "service: http_status:404" "${CONFIG_FILE}"
