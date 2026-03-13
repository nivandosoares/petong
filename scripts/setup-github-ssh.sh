#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_URL="${1:-}"
BRANCH_NAME="${2:-main}"

if [ -z "${REMOTE_URL}" ]; then
  echo "usage: $0 git@github.com:owner/repo.git [branch]"
  exit 1
fi

if [ ! -d "${ROOT_DIR}/.git" ]; then
  echo "git repository not initialized in ${ROOT_DIR}"
  exit 1
fi

if git -C "${ROOT_DIR}" remote get-url origin >/dev/null 2>&1; then
  git -C "${ROOT_DIR}" remote set-url origin "${REMOTE_URL}"
else
  git -C "${ROOT_DIR}" remote add origin "${REMOTE_URL}"
fi

git -C "${ROOT_DIR}" branch -M "${BRANCH_NAME}"

echo "origin => ${REMOTE_URL}"
echo "default branch => ${BRANCH_NAME}"
echo "test SSH with: ssh -T git@github.com"
