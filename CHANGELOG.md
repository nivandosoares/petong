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
