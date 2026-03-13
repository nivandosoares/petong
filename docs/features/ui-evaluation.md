# UI Evaluation Routine

The repository now includes a Chrome-driven UI evaluation routine that inspects the main Petong routes and emits a machine-readable report.

## Purpose

This routine is broader than the Selenium smoke tests.

It evaluates:

- route-level page titles
- main-content rendering
- active navigation semantics through `aria-current`
- visible route-specific content
- browser console errors during route rendering

## Files

- `scripts/run-ui-evaluation.py`
- `tests/e2e/test-ui-evaluation-runner.sh`

## Usage

Run it with a visible Chrome session:

```bash
CHROME_BINARY=/usr/bin/chromium python3 scripts/run-ui-evaluation.py --start-backend
```

Run it headlessly:

```bash
CHROME_BINARY=/usr/bin/chromium python3 scripts/run-ui-evaluation.py --start-backend --headless
```

## Output

The routine writes a JSON report to:

- `tmp/ui-evaluation-report.json`

The process exits with a non-zero status if any finding is detected.

## Current seeded coverage

When the routine starts the backend itself, it seeds:

- a demo user
- a tenant
- a public pet listing
- a fundraising campaign

This allows public-route evaluation without manual setup.
