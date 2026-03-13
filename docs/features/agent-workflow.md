# Autonomous Agent Workflow

This repository uses a local file-based workflow for unattended development cycles.

## Cycle

1. Read the issue queue in `docs/issues.md`.
2. Read the generated runtime plan in `tmp/agent-loop/next-action.md` when present.
3. If tests failed in the previous cycle, fix those failures before taking a new issue.
4. If the runtime plan reports a blocker, stop for human input.
5. Otherwise pick the first open issue.
6. Implement the smallest correct change.
7. Run relevant tests.
8. Update docs and changelog.
9. Bump patch version.
10. Commit.

## Why file-based issues

The workflow does not depend on GitHub Issues or external APIs. This keeps the loop runnable on a local machine without extra credentials.

## Test execution

`scripts/run-tests.sh` discovers backend, frontend, and e2e suites from repository conventions instead of hardcoded placeholder commands.

See `docs/features/test-discovery.md` for the supported layouts and script names.

## Runtime planning

`scripts/update-cycle-plan.sh` turns the latest test result into the next action for the autonomous loop:

- passed tests: continue to the next open issue
- failing tests: prioritize test repair before new feature work
- environmental or configuration blockers: stop and ask for human input

`scripts/agent-loop.sh` stops only when the generated plan is `status: blocked`.

## Installation approvals

The autonomous workflow must stop for explicit human approval before installing runtimes, package managers, external CLIs, or system services.

This now applies to infrastructure helpers such as Cloudflare Tunnel as well.

## Delivery standard

The project now uses a strict `code/doc/test` pipeline for runtime and database-oriented work.

That means an agent should not consider a slice complete unless:

- the code path is implemented
- the relevant docs are updated
- automated tests cover the critical behavior
- live runtime verification is performed when the feature changes user-visible or persistence behavior
