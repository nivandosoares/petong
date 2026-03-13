# Backend Hot Reload

The repository now includes a dependency-free backend hot reload workflow for local development.

## Command

Run:

```bash
npm run start:backend:dev
```

This uses Node.js watch mode through [scripts/start-backend-dev.sh](/home/nivando/petrepo/scripts/start-backend-dev.sh).

## Behavior

- Backend source changes under `backend/` automatically restart the server.
- Frontend file changes under `frontend/` are also watched, so shell and route adjustments reload automatically.
- Frontend static assets are still served from disk on every request, so browser refresh is enough to see content changes.

## Validation

- The startup path is covered by [tests/e2e/test-backend-dev-watch.sh](/home/nivando/petrepo/tests/e2e/test-backend-dev-watch.sh).
