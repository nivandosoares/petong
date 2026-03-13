#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT_PATH="${ROOT_DIR}/scripts/update-cycle-plan.sh"
STATE_DIR="$(mktemp -d)"
PLAN_FILE="${STATE_DIR}/next-action.md"

cleanup() {
  rm -rf "${STATE_DIR}"
}

trap cleanup EXIT

assert_contains() {
  local file_path="$1"
  local expected="$2"

  grep -Fq "${expected}" "${file_path}"
}

run_case() {
  local status="$1"
  local log_content="$2"
  local expected_exit="$3"
  local expected_plan_status="$4"

  local log_file="${STATE_DIR}/test.log"
  : > "${log_file}"
  printf '%s\n' "${log_content}" > "${log_file}"

  set +e
  AGENT_LOOP_STATE_DIR="${STATE_DIR}" bash "${SCRIPT_PATH}" "${status}" "${log_file}" >/dev/null 2>&1
  local exit_code=$?
  set -e

  if [ "${exit_code}" -ne "${expected_exit}" ]; then
    echo "expected exit ${expected_exit}, got ${exit_code}"
    exit 1
  fi

  if ! assert_contains "${PLAN_FILE}" "status: ${expected_plan_status}"; then
    echo "missing plan status ${expected_plan_status}"
    exit 1
  fi
}

run_case "passed" "all good" 0 "continue"
run_case "failed" "1 failing test" 0 "fix_tests"
run_case "failed" "backend detected but pytest is unavailable" 10 "blocked"
