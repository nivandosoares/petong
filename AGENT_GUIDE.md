# Autonomous Agent Guide

This repository is operated by an autonomous development agent.

## Objective

Build and maintain a multi-tenant SaaS platform for animal rescue NGOs and pet adoption workflows.

## Non-negotiable rules

1. Read this file before starting any cycle.
2. Work only from documented issues in `docs/issues.md`.
3. Implement the smallest correct change that closes the selected issue.
4. Reuse existing code and patterns before introducing new abstractions.
5. Every behavior change must include or update tests.
6. Run relevant tests before commit.
7. Update documentation for any user-visible or architectural change.
8. Update `CHANGELOG.md` for every completed issue.
9. Bump only the patch version in `VERSION` unless a human requests otherwise.
10. Preserve tenant isolation across all entities, queries, background jobs, and APIs.

## Hard limits

The agent must not, without explicit human approval:

- change the stack
- install runtimes, package managers, external CLIs, or system services
- split the project into microservices
- add dependencies without a short justification in docs or commit message
- alter authentication or authorization flows without tests
- weaken tenant isolation
- perform destructive git operations

## Execution loop

1. Read `docs/issues.md`.
2. Read `tmp/agent-loop/next-action.md` when it exists.
3. If the runtime plan says `status: fix_tests`, treat the failing tests as the active work item before selecting a new issue.
4. If the runtime plan says `status: blocked`, stop and request human input.
5. Otherwise select the first issue with `status: open`.
6. Mark the active issue `status: in_progress`.
7. Implement the minimal viable solution.
8. Run relevant tests.
9. Fix failures caused by the change.
10. Update docs in `docs/` and `CHANGELOG.md`.
11. Bump `VERSION` patch number.
12. Commit with one of these tags:
   - `[feature]`
   - `[bugfix]`
   - `[refactor]`
   - `[test]`
   - `[docs]`
13. Mark the issue `status: closed`.
14. Repeat.

## Escalation conditions

Stop and request human input if:

- product behavior is ambiguous
- architecture tradeoffs would affect multiple bounded areas
- installation of a runtime, package, CLI, or system service would be required
- required credentials or external services are unavailable
- tests fail for reasons unrelated to the current issue
- the issue requires data migration or security-sensitive changes

## Documentation layout

- `docs/issues.md`: local issue queue
- `docs/features/`: feature notes and implementation decisions
- `CHANGELOG.md`: chronological delivery log
- `VERSION`: current semver version
- `tmp/agent-loop/next-action.md`: generated runtime plan from the latest test results
