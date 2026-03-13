#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROMPT_FILE="${ROOT_DIR}/AGENT_PROMPT.md"
SLEEP_SECONDS="${AGENT_LOOP_SLEEP_SECONDS:-120}"
STATE_DIR="${AGENT_LOOP_STATE_DIR:-${ROOT_DIR}/tmp/agent-loop}"
TEST_LOG_FILE="${STATE_DIR}/latest-test.log"
PLAN_FILE="${STATE_DIR}/next-action.md"

if ! command -v codex >/dev/null 2>&1; then
  echo "codex CLI not found in PATH"
  exit 1
fi

mkdir -p "${STATE_DIR}"

while true; do
  echo "[agent-loop] starting cycle at $(date -Iseconds)"

  codex run \
    --model "${CODEX_MODEL:-gpt-5}" \
    --repo "${ROOT_DIR}" \
    --prompt-file "${PROMPT_FILE}"

  echo "[agent-loop] running tests"
  if "${ROOT_DIR}/scripts/run-tests.sh" > >(tee "${TEST_LOG_FILE}") 2>&1; then
    TEST_STATUS="passed"
  else
    TEST_STATUS="failed"
  fi

  echo "[agent-loop] updating next-cycle plan from ${TEST_STATUS} tests"
  if bash "${ROOT_DIR}/scripts/update-cycle-plan.sh" "${TEST_STATUS}" "${TEST_LOG_FILE}"; then
    :
  else
    PLAN_EXIT_CODE=$?
    if [ "${PLAN_EXIT_CODE}" -eq 10 ]; then
      echo "[agent-loop] blocker detected, stopping loop"
      echo "[agent-loop] review ${PLAN_FILE}"
      exit 10
    fi

    exit "${PLAN_EXIT_CODE}"
  fi

  echo "[agent-loop] sleeping for ${SLEEP_SECONDS}s"
  sleep "${SLEEP_SECONDS}"
done
