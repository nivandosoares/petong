# UI Audit Workflow for Autonomous Agent

Use this workflow when the goal is to automatically detect UI gaps from real SaaS use cases and feed them back into code/test/review cycles.

## 1) Run the audit

```bash
npm run test:e2e
```

This command:
- starts backend locally,
- runs Selenium workflow against the frontend app shell,
- writes reports to `tmp/ui-audit/`.

## 2) Read generated findings

- Machine report: `tmp/ui-audit/ui-audit-report.json`
- Human report: `tmp/ui-audit/ui-audit-report.md`

Severity policy:
- `high`: must be fixed before new feature work.
- `medium`: create issue and plan UX/code follow-up.

## 3) Convert findings into tasks

For each finding:
1. Open/Update issue in `docs/issues.md` with acceptance criteria.
2. Add/update tests reproducing the failure or gap.
3. Implement minimal fix.
4. Re-run `npm run test:e2e`.

## 4) Keep loop deterministic

Set these env vars in CI/agent loop when needed:

- `BASE_URL` (default `http://127.0.0.1:3001`)
- `UI_WAIT_SECONDS` (default `12`)
- `UI_AUDIT_REPORT_DIR` (default `tmp/ui-audit`)
- `UI_AUDIT_STRICT=1` to fail cycle on high-severity findings.
