# Autonomous Agent Workflow

This repository uses a local file-based workflow for unattended development cycles.

## Cycle

1. Read the issue queue in `docs/issues.md`.
2. Pick the first open issue.
3. Implement the smallest correct change.
4. Run relevant tests.
5. Update docs and changelog.
6. Bump patch version.
7. Commit.

## Why file-based issues

The workflow does not depend on GitHub Issues or external APIs. This keeps the loop runnable on a local machine without extra credentials.

## Required follow-up

Replace placeholder test commands in `scripts/run-tests.sh` when the application structure is in place.
