# Changelog

All notable autonomous-agent changes should be recorded here.

## Unreleased

- Initialized autonomous agent workflow scaffold.
- Added git bootstrap, SSH remote setup, and safer auto-commit automation.
- Replaced placeholder test execution with convention-based backend, frontend, and e2e discovery.
- Verified GitHub SSH authentication and pushed `main` to the SSH remote.
- Added test-result-driven runtime planning so the loop continues automatically, fixes test failures next, and stops only on blockers.
- Added the first tenant-aware backend implementation slice for pets and adoption applications with automated Node tests.
- Added a Cloudflare Tunnel helper for remote live previews and enforced explicit approval before future software installation steps.
- Added a lightweight live preview page and local server so the Cloudflare tunnel exposes real content immediately.
- Added a tenant-aware HTTP API for pets and adoption applications with backend integration tests.
- Added the first interactive frontend for the adoption workflow, served by the backend with frontend tests.
- Added file-backed persistence so pets and applications survive backend restarts.
- Added Sprint 1 platform foundations with tenant entities, JWT auth, memberships, tenant resolution, and integrated frontend shells.
- Added Sprint 2 NGO management, branding updates, member administration, and public tenant landing pages.
- Added a formal database `code/doc/test` pipeline and an agent handoff/install guide for future continuation.
- Added Sprint 3 pet management with richer pet fields, archiving, and public tenant pet listings.
- Added Sprint 4 adoption discovery with profile-driven compatibility matching and discovery UI.
- Added Sprint 5 adoption workflow states, reviewer notes, applicant history, and frontend review tracking.
- Added a dependency-free backend hot reload command for local development.
- Redesigned the dependency-free frontend to follow the `Lovable App.mhtml` landing-page reference while preserving the existing tenant, pet, and adoption workflows.
- Added Sprint 6 donation transparency with tenant-scoped campaigns, donations, expenses, public totals, and dashboard management UI.
- Split the frontend into route-based dashboard sections so NGO, pet, adoption, and transparency work no longer live on one oversized page.
- Fixed direct shell routing for `/about` and `/register`, and added an optional Python Selenium UI smoke-test harness for Chrome WebDriver automation.
- Expanded the Selenium harness to seed public-route data automatically and default to a visible Chrome session unless `--headless` is requested.
