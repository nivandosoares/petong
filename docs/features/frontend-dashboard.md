# Frontend Dashboard Slice

The project now includes the first interactive browser UI, served directly by the current Node backend.

## Current capabilities

- choose the active tenant with a simple tenant field
- register pets for that tenant
- list only that tenant's pets
- submit adoption applications
- approve submitted applications
- surface API errors directly in the interface

## Delivery shape

The frontend is intentionally dependency-free:

- `frontend/index.html`
- `frontend/styles.css`
- `frontend/presenter.js`
- `frontend/app.js`

The backend serves these assets at:

- `/`
- `/styles.css`
- `/presenter.js`
- `/app.js`

## Why this shape

This keeps the frontend shippable immediately on the current stack while preserving room to evolve later into a larger client application if needed.
