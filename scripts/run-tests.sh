#!/usr/bin/env bash

set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

run_if_present() {
  local description="$1"
  shift

  echo "[tests] ${description}"
  "$@" || return 1
}

if [ -f "${ROOT_DIR}/package.json" ]; then
  if npm run | grep -q "test"; then
    run_if_present "npm run test" npm run test
  else
    echo "[tests] package.json found but no npm test script is available"
  fi
else
  echo "[tests] package.json not found, skipping npm tests"
fi

if [ -d "${ROOT_DIR}/tests" ] || [ -d "${ROOT_DIR}/test" ]; then
  if command -v pytest >/dev/null 2>&1; then
    if [ -d "${ROOT_DIR}/tests/selenium" ]; then
      run_if_present "pytest tests/selenium" pytest "${ROOT_DIR}/tests/selenium"
    else
      echo "[tests] selenium suite not found, skipping pytest tests/selenium"
    fi
  else
    echo "[tests] pytest not found, skipping python tests"
  fi
else
  echo "[tests] no python test directories found"
fi
