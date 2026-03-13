#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="${AGENT_LOOP_STATE_DIR:-${ROOT_DIR}/tmp/agent-loop}"
PLAN_FILE="${STATE_DIR}/next-action.md"
TEST_STATUS="${1:-}"
TEST_LOG_FILE="${2:-}"
TIMESTAMP="$(date -Iseconds)"

if [ -z "${TEST_STATUS}" ]; then
  echo "usage: $0 passed|failed [test-log-file]"
  exit 1
fi

mkdir -p "${STATE_DIR}"

write_plan() {
  local status="$1"
  local summary="$2"
  local action="$3"
  local stop_reason="${4:-none}"

  cat > "${PLAN_FILE}" <<EOF
# Next Cycle Plan

status: ${status}
updated_at: ${TIMESTAMP}
test_status: ${TEST_STATUS}
stop_reason: ${stop_reason}

summary:
${summary}

next_action:
${action}
EOF
}

if [ "${TEST_STATUS}" = "passed" ]; then
  write_plan \
    "continue" \
    "- Relevant tests passed in the last cycle." \
    "- Continue the normal issue-driven workflow.
- Select the first open issue in \`docs/issues.md\`.
- Do not stop unless a critical decision or blocker appears."
  echo "[cycle-plan] continue"
  exit 0
fi

if [ -z "${TEST_LOG_FILE}" ] || [ ! -f "${TEST_LOG_FILE}" ]; then
  write_plan \
    "blocked" \
    "- Test execution failed and no readable log was available." \
    "- Stop the autonomous loop.
- Request human input because the failure could not be classified automatically." \
    "missing_test_log"
  echo "[cycle-plan] blocked: missing_test_log"
  exit 10
fi

if grep -Eqi "detected but .* unavailable|tests found but .* unavailable|package found but no supported .* script was detected|config found but no supported .* script was detected|could not resolve hostname|permission denied|authentication failed|not configured|not found" "${TEST_LOG_FILE}"; then
  write_plan \
    "blocked" \
    "- The last test run indicates an environment, credential, or configuration blocker." \
    "- Stop the autonomous loop.
- Request human input with the relevant failing tool or configuration message.
- Resume only after the blocker is resolved." \
    "external_blocker"
  echo "[cycle-plan] blocked: external_blocker"
  exit 10
fi

write_plan \
  "fix_tests" \
  "- The last cycle introduced or exposed failing tests that should be addressed before new feature work." \
  "- In the next cycle, prioritize fixing the failing tests before selecting a new issue.
- Treat the failing test output as the active work item.
- Resume normal issue selection only after the relevant tests pass."
echo "[cycle-plan] fix_tests"
