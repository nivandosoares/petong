# Frontend Dashboard Slice

The project now includes the first interactive browser UI, served directly by the current Node backend.

## Current capabilities

- choose the active tenant with a simple tenant field
- register pets for that tenant
- list only that tenant's pets
- submit adoption applications
- approve submitted applications
- surface API errors directly in the interface
- present the dashboard inside a landing-page shell inspired by the `Lovable App.mhtml` reference in the repo root
- keep the public tenant preview visible as part of the main page narrative instead of isolating it in a plain admin block
- expose donation transparency management in the workspace and public NGO page
- split the dashboard into focused routes so users can jump directly to NGO, pets, adoptions, or transparency work

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

## Visual direction

The frontend now follows the warm, rounded, marketing-style example captured in `Lovable App.mhtml`:

- sticky navigation and hero-first composition
- warm orange and gold palette with rounded cards
- public NGO preview promoted into the main landing flow
- operations forms reorganized into a branded workspace section without changing frontend IDs or backend integration points
- campaign, donation, expense, and transparency summary panels wired to the live API
- route-aware navigation that hides unrelated dashboard sections on each page
