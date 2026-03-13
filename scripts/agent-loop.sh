#!/usr/bin/env bash

set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROMPT_FILE="${ROOT_DIR}/AGENT_PROMPT.md"
SLEEP_SECONDS="${AGENT_LOOP_SLEEP_SECONDS:-120}"

if ! command -v codex >/dev/null 2>&1; then
  echo "codex CLI not found in PATH"
  exit 1
fi

while true; do
  echo "[agent-loop] starting cycle at $(date -Iseconds)"

  codex run \
    --model "${CODEX_MODEL:-gpt-5}" \
    --repo "${ROOT_DIR}" \
    --prompt-file "${PROMPT_FILE}"

  echo "[agent-loop] running tests"
  "${ROOT_DIR}/scripts/run-tests.sh" || true

  echo "[agent-loop] sleeping for ${SLEEP_SECONDS}s"
  sleep "${SLEEP_SECONDS}"
done
