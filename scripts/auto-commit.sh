#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_TAG="${1:-[auto]}"
VERSION_FILE="${ROOT_DIR}/VERSION"
BRANCH_NAME="${AUTO_COMMIT_BRANCH:-main}"

if [ ! -d "${ROOT_DIR}/.git" ]; then
  echo "git repository not initialized in ${ROOT_DIR}"
  exit 1
fi

if [ ! -f "${VERSION_FILE}" ]; then
  echo "VERSION file not found"
  exit 1
fi

VERSION="$(cat "${VERSION_FILE}")"

if ! git -C "${ROOT_DIR}" config user.name >/dev/null; then
  echo "git user.name is not configured"
  exit 1
fi

if ! git -C "${ROOT_DIR}" config user.email >/dev/null; then
  echo "git user.email is not configured"
  exit 1
fi

if ! git -C "${ROOT_DIR}" rev-parse --verify "${BRANCH_NAME}" >/dev/null 2>&1; then
  git -C "${ROOT_DIR}" checkout -b "${BRANCH_NAME}"
else
  git -C "${ROOT_DIR}" checkout "${BRANCH_NAME}"
fi

git -C "${ROOT_DIR}" add .

if git -C "${ROOT_DIR}" diff --cached --quiet; then
  echo "no staged changes to commit"
  exit 0
fi

git -C "${ROOT_DIR}" commit -m "${DEFAULT_TAG} agent cycle update v${VERSION}"

if [ "${AUTO_PUSH:-0}" = "1" ]; then
  if git -C "${ROOT_DIR}" remote get-url origin >/dev/null 2>&1; then
    git -C "${ROOT_DIR}" push -u origin "${BRANCH_NAME}"
  else
    echo "origin remote not configured, skipping git push"
  fi
else
  echo "AUTO_PUSH not enabled, skipping git push"
fi
