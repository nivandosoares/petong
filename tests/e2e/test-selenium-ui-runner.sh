#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

python3 "${ROOT_DIR}/scripts/run-selenium-ui-tests.py" --help >/dev/null
grep -q "selenium" "${ROOT_DIR}/requirements-ui.txt"
python3 "${ROOT_DIR}/scripts/run-selenium-ui-tests.py" --help | grep -q "auth-flow"
