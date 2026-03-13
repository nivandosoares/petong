# Database Implementation Pipeline

Database work is now an explicit delivery track in the product pipeline.

## Rule

Every database-oriented change must be delivered as a `code/doc/test` slice.

That means each database step must include:

- `code`
  - schema or storage implementation
  - runtime wiring
  - backward-compatible data handling where possible
- `doc`
  - feature or architecture note under `docs/features/`
  - any required operator setup/update instructions
  - changelog and issue queue updates
- `test`
  - automated coverage for repository behavior
  - persistence and restart verification when relevant
  - tenant-boundary verification when data is tenant-scoped

## Pipeline stages

1. Define the minimal data model required for the current sprint.
2. Implement the storage layer behind the current service boundary.
3. Keep the public API and UI functional while the storage layer changes.
4. Document the runtime shape, file paths, environment variables, and operational limits.
5. Add automated tests that prove the data survives the expected lifecycle.
6. Verify the live runtime path, not only isolated unit coverage.

## Standards for future database migration

When moving from file-backed storage to a relational database or another persistent engine:

- do not bypass the existing service layer
- preserve strict tenant isolation in queries and writes
- add a dedicated setup section to the agent handoff doc
- treat migrations as high-signal changes that require `code/doc/test` in the same cycle

## Planned next database milestones

- replace file-backed platform and adoption storage with a real database engine
- add migration handling for tenant, membership, pet, application, and future donation entities
- add environment-specific startup instructions for local development and preview environments
