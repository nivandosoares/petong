#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

NAME="${GIT_USER_NAME:-}"
EMAIL="${GIT_USER_EMAIL:-}"

if [ ! -d "${ROOT_DIR}/.git" ]; then
  git -C "${ROOT_DIR}" init -b main
fi

if [ -n "${NAME}" ]; then
  git -C "${ROOT_DIR}" config user.name "${NAME}"
fi

if [ -n "${EMAIL}" ]; then
  git -C "${ROOT_DIR}" config user.email "${EMAIL}"
fi

echo "git branch: $(git -C "${ROOT_DIR}" branch --show-current)"
echo "git user.name: $(git -C "${ROOT_DIR}" config user.name || echo unset)"
echo "git user.email: $(git -C "${ROOT_DIR}" config user.email || echo unset)"
