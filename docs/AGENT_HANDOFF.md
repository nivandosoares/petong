# Agent Handoff And Installation

This document is the minimal operator and agent bootstrap guide for continuing the project without relying on prior conversation context.

## Current project state

- Stack:
  - Node.js 24
  - npm 11
  - plain Node HTTP server
  - dependency-free frontend served by the backend
- Product progress:
  - Sprint 1 foundation implemented
  - Sprint 2 NGO management and public theming implemented
  - Sprint 3 pet management implemented
  - Sprint 4 adoption discovery implemented
  - Sprint 5 adoption workflow implemented
  - Sprint 6 donation transparency implemented
- Remote preview:
  - Cloudflare quick tunnel workflow exists
  - local helper binary currently lives at `tools/cloudflared`

## Repo bootstrap

1. Open the repository root.
2. Read `AGENT_GUIDE.md`.
3. Read `docs/issues.md`.
4. Read `tmp/agent-loop/next-action.md` if it exists.
5. Read the relevant feature notes in `docs/features/` for the issue being continued.

## Local prerequisites

- `node`
- `npm`
- `python3`

Optional:

- `cloudflared` or the repo-local binary at `tools/cloudflared`
- Google Chrome or Chromium plus `chromedriver` for optional Selenium UI tests

## Install policy

Do not install new runtimes, package managers, CLIs, or services without explicit human approval.

If installation is required for the next task, stop and ask first.

## Run commands

Backend and frontend tests:

```bash
npm run test:backend
npm run test:frontend
./scripts/run-tests.sh
```

Optional Selenium UI smoke tests:

```bash
python3 -m pip install -r requirements-ui.txt
CHROME_BINARY=/usr/bin/chromium python3 scripts/run-selenium-ui-tests.py --start-backend
BASE_URL=http://127.0.0.1:3001 CHROME_BINARY=/usr/bin/chromium python3 frontend/tests/selenium_ui_sequences.py
```

Run the app:

```bash
npm run start:backend
```

Default app URL:

```text
http://localhost:3001
```

Preview page only:

```bash
bash scripts/start-preview.sh 3000
```

Cloudflare quick tunnel:

```bash
bash scripts/start-cloudflare-tunnel.sh quick http://localhost:3000
```

## Data files

Default runtime data files:

- `tmp/petong-data.json`
- `tmp/petong-platform.json`
- `tmp/petong-transparency.json`

Override paths:

- `PETONG_DATA_FILE`
- `PETONG_PLATFORM_DATA_FILE`
- `PETONG_TRANSPARENCY_DATA_FILE`
- `PETONG_JWT_SECRET`

## Delivery standard

Every meaningful change must follow `code/doc/test`.

Checklist:

- code updated
- docs updated
- tests added or updated
- runtime behavior verified when the change affects the running app

For database work, also read:

- `docs/features/database-pipeline.md`
- `docs/features/persistence.md`

## Current feature notes

For the completed product slices, review:

- `docs/features/sprint-1-foundation.md`
- `docs/features/ngo-theming.md`
- `docs/features/pet-management.md`
- `docs/features/adoption-discovery.md`
- `docs/features/adoption-workflow.md`
- `docs/features/donation-transparency.md`
- `docs/features/password-reset.md`
- `docs/features/selenium-ui-tests.md`
- `docs/features/ui-evaluation.md`

## Git and automation

- Use the existing issue queue in `docs/issues.md`.
- Keep version bumps patch-only unless a human asks otherwise.
- Update `CHANGELOG.md` on each completed issue.
- Push only after tests and relevant runtime verification pass.
