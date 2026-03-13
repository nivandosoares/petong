#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RAN_ANY=0

run_suite() {
  local label="$1"
  shift

  RAN_ANY=1
  echo "[tests] running ${label}: $*"
  "$@"
}

npm_has_script() {
  local dir="$1"
  local script_name="$2"

  command -v npm >/dev/null 2>&1 || return 1
  [ -f "${dir}/package.json" ] || return 1

  npm --prefix "${dir}" run | grep -Eq "(^|[[:space:]])${script_name}$"
}

run_npm_script_if_present() {
  local label="$1"
  local dir="$2"
  local script_name="$3"

  if npm_has_script "${dir}" "${script_name}"; then
    run_suite "${label}" npm --prefix "${dir}" run "${script_name}"
    return 0
  fi

  return 1
}

detect_backend() {
  if run_npm_script_if_present "backend" "${ROOT_DIR}" "test:backend"; then
    return 0
  fi

  if run_npm_script_if_present "backend" "${ROOT_DIR}/backend" "test"; then
    return 0
  fi

  if [ -f "${ROOT_DIR}/pyproject.toml" ] || [ -f "${ROOT_DIR}/pytest.ini" ]; then
    if command -v pytest >/dev/null 2>&1; then
      run_suite "backend" pytest
      return 0
    fi

    echo "[tests] backend detected but pytest is unavailable"
    return 1
  fi

  if [ -d "${ROOT_DIR}/backend/tests" ]; then
    if command -v pytest >/dev/null 2>&1; then
      run_suite "backend" pytest "${ROOT_DIR}/backend/tests"
      return 0
    fi

    echo "[tests] backend tests found but pytest is unavailable"
    return 1
  fi

  if [ -f "${ROOT_DIR}/go.mod" ]; then
    if command -v go >/dev/null 2>&1; then
      run_suite "backend" go test ./...
      return 0
    fi

    echo "[tests] Go backend detected but go is unavailable"
    return 1
  fi

  if [ -f "${ROOT_DIR}/Cargo.toml" ]; then
    if command -v cargo >/dev/null 2>&1; then
      run_suite "backend" cargo test
      return 0
    fi

    echo "[tests] Rust backend detected but cargo is unavailable"
    return 1
  fi

  echo "[tests] no backend suite detected"
}

detect_frontend() {
  if run_npm_script_if_present "frontend" "${ROOT_DIR}" "test:frontend"; then
    return 0
  fi

  if run_npm_script_if_present "frontend" "${ROOT_DIR}/frontend" "test"; then
    return 0
  fi

  if [ -f "${ROOT_DIR}/frontend/package.json" ]; then
    echo "[tests] frontend package found but no supported frontend test script was detected"
    return 1
  fi

  echo "[tests] no frontend suite detected"
}

detect_e2e() {
  if run_npm_script_if_present "e2e" "${ROOT_DIR}" "test:e2e"; then
    return 0
  fi

  if run_npm_script_if_present "e2e" "${ROOT_DIR}/frontend" "test:e2e"; then
    return 0
  fi

  if [ -d "${ROOT_DIR}/tests/e2e" ]; then
    if command -v pytest >/dev/null 2>&1; then
      run_suite "e2e" pytest "${ROOT_DIR}/tests/e2e"
      return 0
    fi

    echo "[tests] e2e tests found but pytest is unavailable"
    return 1
  fi

  if [ -f "${ROOT_DIR}/playwright.config.js" ] || [ -f "${ROOT_DIR}/playwright.config.ts" ] || [ -f "${ROOT_DIR}/cypress.config.js" ] || [ -f "${ROOT_DIR}/cypress.config.ts" ]; then
    echo "[tests] e2e config found but no supported npm e2e script was detected"
    return 1
  fi

  echo "[tests] no e2e suite detected"
}

detect_backend
detect_frontend
detect_e2e

if [ "${RAN_ANY}" -eq 0 ]; then
  echo "[tests] no project-specific test suites were detected"
fi
