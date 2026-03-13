# Selenium UI Test Harness

The repository now includes an optional Python-based Selenium runner for browser interaction smoke tests.

## Purpose

This harness is for route and UI workflow checks that need a real browser:

- landing route rendering
- dashboard subsection navigation
- seeded public tenant route rendering
- not-found fallback behavior

It is intentionally optional and does not run as part of the default test loop because it depends on local browser tooling.

## Files

- `scripts/run-selenium-ui-tests.py`
- `requirements-ui.txt`

## Local prerequisites

- `python3`
- Google Chrome or Chromium
- `chromedriver` available on `PATH`
- Python package install from `requirements-ui.txt`

Optional:

- `CHROME_BINARY` if Chrome is not in the default location

## Install

```bash
python3 -m pip install -r requirements-ui.txt
```

## Usage

Against an already running backend in a visible browser:

```bash
CHROME_BINARY=/usr/bin/chromium python3 scripts/run-selenium-ui-tests.py
```

Start the backend automatically before the test:

```bash
CHROME_BINARY=/usr/bin/chromium python3 scripts/run-selenium-ui-tests.py --start-backend
```

Limit the run to a specific smoke suite:

```bash
CHROME_BINARY=/usr/bin/chromium python3 scripts/run-selenium-ui-tests.py --start-backend --test routes
CHROME_BINARY=/usr/bin/chromium python3 scripts/run-selenium-ui-tests.py --start-backend --test public
```

Run in CI or without a visible desktop:

```bash
CHROME_BINARY=/usr/bin/chromium python3 scripts/run-selenium-ui-tests.py --start-backend --headless --test routes
```

## Notes

- The public smoke test now seeds its own user, tenant, pet, campaign, and donation through the live API before opening the tenant route.
- The default automated repo test only validates that the runner and requirement file are present. Full Selenium execution is manual until Chrome and WebDriver availability are standardized in the environment.
