#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

grep -Fq "Petong is now reachable remotely." "${ROOT_DIR}/preview/index.html"
grep -Fq "Cloudflare Tunnel" "${ROOT_DIR}/preview/index.html"
grep -Fq "http.server" "${ROOT_DIR}/scripts/start-preview.sh"
