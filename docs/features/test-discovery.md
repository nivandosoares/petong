# Test Discovery Conventions

The autonomous loop uses `scripts/run-tests.sh` to discover and run project-specific test suites without editing the script for each repo change.

## Supported suites

- Backend:
  - `npm run test:backend` from the repository root
  - `npm --prefix backend run test`
  - `bash tests/backend/*.sh`
  - `pytest` when `pyproject.toml` or `pytest.ini` exists at the root
  - `pytest backend/tests`
  - `go test ./...`
  - `cargo test`
- Frontend:
  - `npm run test:frontend` from the repository root
  - `npm --prefix frontend run test`
- End-to-end:
  - `npm run test:e2e` from the repository root
  - `npm --prefix frontend run test:e2e`
  - `bash tests/e2e/*.sh`
  - `pytest tests/e2e`

## Optional browser automation

The repo also includes an optional Selenium runner for manual browser interaction checks:

- `python3 scripts/run-selenium-ui-tests.py`

This is not part of the default test discovery flow because it depends on local Chrome and `chromedriver` availability.

## Run order

The runner executes suites in this order:

1. backend
2. frontend
3. e2e

This keeps fast unit and integration checks ahead of slower browser or workflow coverage.

## Missing suite behavior

If a suite is not present, the runner reports that it was not detected and continues.

If a project structure is present but the required tool or supported script is missing, the runner exits with an error so the autonomous loop does not silently skip expected coverage.
