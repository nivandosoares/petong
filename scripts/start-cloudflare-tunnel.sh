#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="${CF_TUNNEL_STATE_DIR:-${ROOT_DIR}/tmp/cloudflare}"
CONFIG_FILE="${CF_TUNNEL_CONFIG:-${STATE_DIR}/config.yml}"
MODE="${1:-quick}"
LOCAL_URL="${2:-${CF_TUNNEL_URL:-http://localhost:3000}}"
TUNNEL_ID="${CF_TUNNEL_ID:-}"
TUNNEL_HOSTNAME="${CF_TUNNEL_HOSTNAME:-}"
CREDENTIALS_FILE="${CF_TUNNEL_CREDENTIALS_FILE:-}"

usage() {
  cat <<EOF
usage:
  $0 quick [local-url]
  $0 print-config [local-url]
  $0 named [local-url]

environment:
  CF_TUNNEL_ID                required for print-config and named
  CF_TUNNEL_HOSTNAME          required for print-config and named
  CF_TUNNEL_CREDENTIALS_FILE  required for print-config and named
  CF_TUNNEL_CONFIG            optional config path
  CF_TUNNEL_STATE_DIR         optional state directory
  CF_TUNNEL_URL               default local URL when no argument is passed
EOF
}

ensure_cloudflared() {
  if command -v cloudflared >/dev/null 2>&1; then
    return 0
  fi

  echo "cloudflared is not installed."
  echo "Request installation approval before proceeding with Cloudflare Tunnel setup."
  exit 10
}

ensure_named_env() {
  if [ -z "${TUNNEL_ID}" ] || [ -z "${TUNNEL_HOSTNAME}" ] || [ -z "${CREDENTIALS_FILE}" ]; then
    echo "CF_TUNNEL_ID, CF_TUNNEL_HOSTNAME, and CF_TUNNEL_CREDENTIALS_FILE are required."
    exit 1
  fi
}

write_config() {
  mkdir -p "${STATE_DIR}"

  cat > "${CONFIG_FILE}" <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CREDENTIALS_FILE}

ingress:
  - hostname: ${TUNNEL_HOSTNAME}
    service: ${LOCAL_URL}
  - service: http_status:404
EOF
}

case "${MODE}" in
  quick)
    ensure_cloudflared
    exec cloudflared tunnel --url "${LOCAL_URL}"
    ;;
  print-config)
    ensure_named_env
    write_config
    echo "wrote ${CONFIG_FILE}"
    ;;
  named)
    ensure_cloudflared
    ensure_named_env
    write_config
    exec cloudflared tunnel --config "${CONFIG_FILE}" run "${TUNNEL_ID}"
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    usage
    exit 1
    ;;
esac
